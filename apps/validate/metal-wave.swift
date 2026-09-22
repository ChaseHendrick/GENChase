import Foundation
import Metal
import CryptoKit
import IOKit.ps

func emit(_ value: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!)
    fflush(stdout)
}
func telemetry() -> [String: Any] {
    let names: [ProcessInfo.ThermalState: String] = [.nominal: "nominal", .fair: "fair", .serious: "serious", .critical: "critical"]
    var battery: Bool? = nil
    if let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(), let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef] {
        for item in list {
            if let desc = IOPSGetPowerSourceDescription(info, item)?.takeUnretainedValue() as? [String: Any], let state = desc[kIOPSPowerSourceStateKey] as? String {
                battery = state == kIOPSBatteryPowerValue
            }
        }
    }
    return ["thermal": names[ProcessInfo.processInfo.thermalState] ?? "unknown", "onBattery": battery as Any? ?? NSNull()]
}
if CommandLine.arguments.contains("--telemetry") { emit(telemetry()); exit(0) }

struct Params { var n: UInt32; var r2: Float }
let shader = """
#include <metal_stdlib>
using namespace metal;
struct Params { uint n; float r2; };
kernel void wave(device const float* u [[buffer(0)]], device const float* previous [[buffer(1)]],
                 device float* next [[buffer(2)]], constant Params& p [[buffer(3)]], uint i [[thread_position_in_grid]]) {
    uint n=p.n; if(i>=n*n*n) return;
    uint x=i%n, y=(i/n)%n, z=i/(n*n);
    uint xp=z*n*n+y*n+(x+1)%n, xm=z*n*n+y*n+(x+n-1)%n;
    uint yp=z*n*n+((y+1)%n)*n+x, ym=z*n*n+((y+n-1)%n)*n+x;
    uint zp=((z+1)%n)*n*n+y*n+x, zm=((z+n-1)%n)*n*n+y*n+x;
    float lap=u[xp]+u[xm]+u[yp]+u[ym]+u[zp]+u[zm]-6.0f*u[i];
    next[i]=2.0f*u[i]-previous[i]+p.r2*lap;
}
"""
func check(_ condition: Bool, _ message: String) throws {
    if !condition { throw NSError(domain: "GENChaseMetal", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
}
func initial(_ n: Int) -> [Float] {
    (0..<(n*n*n)).map { i in Float(cos(2 * Double.pi * Double(i%n + 2*((i/n)%n) + i/(n*n)) / Double(n) + 0.31)) }
}
func laplacian(_ a: [Double], _ n: Int, _ i: Int) -> Double {
    let x=i%n, y=(i/n)%n, z=i/(n*n)
    return a[z*n*n+y*n+(x+1)%n] + a[z*n*n+y*n+(x+n-1)%n] + a[z*n*n+((y+1)%n)*n+x] + a[z*n*n+((y+n-1)%n)*n+x] + a[((z+1)%n)*n*n+y*n+x] + a[((z+n-1)%n)*n*n+y*n+x] - 6*a[i]
}
func startState(_ n: Int, _ r2: Float) -> ([Float], [Float]) {
    let u = initial(n), d = u.map(Double.init)
    return (u, (0..<u.count).map { Float(d[$0] + 0.5 * Double(r2) * laplacian(d, n, $0)) })
}
func cpu(_ u: [Float], _ previous: [Float], _ n: Int, _ r2: Float, _ steps: Int) -> [Double] {
    var a=u.map(Double.init), b=previous.map(Double.init)
    for _ in 0..<steps {
        let next=(0..<a.count).map { 2*a[$0] - b[$0] + Double(r2)*laplacian(a,n,$0) }
        b=a; a=next
    }
    return a
}
final class Wave {
    let device: MTLDevice, queue: MTLCommandQueue, pipeline: MTLComputePipelineState, n: Int
    var current: MTLBuffer, previous: MTLBuffer, spare: MTLBuffer, step=0
    let r2: Float
    init(device: MTLDevice, pipeline: MTLComputePipelineState, n: Int, r2: Float = 0.16) throws {
        self.device=device; self.pipeline=pipeline; self.n=n; self.r2=r2
        guard let q=device.makeCommandQueue(), let a=device.makeBuffer(length:n*n*n*4,options:.storageModeShared), let b=device.makeBuffer(length:n*n*n*4,options:.storageModeShared), let c=device.makeBuffer(length:n*n*n*4,options:.storageModeShared) else { throw NSError(domain:"Metal allocation",code:1) }
        queue=q; current=a; previous=b; spare=c
        let (u,v)=startState(n,r2)
        u.withUnsafeBytes { current.contents().copyMemory(from:$0.baseAddress!,byteCount:$0.count) }
        v.withUnsafeBytes { previous.contents().copyMemory(from:$0.baseAddress!,byteCount:$0.count) }
    }
    func advance(_ count: Int, sign: Float = 1) throws {
        guard let command=queue.makeCommandBuffer() else { throw NSError(domain:"Metal command",code:1) }
        for _ in 0..<count {
            guard let encoder=command.makeComputeCommandEncoder() else { throw NSError(domain:"Metal encoder",code:1) }
            encoder.setComputePipelineState(pipeline)
            encoder.setBuffer(current,offset:0,index:0); encoder.setBuffer(previous,offset:0,index:1); encoder.setBuffer(spare,offset:0,index:2)
            var params=Params(n:UInt32(n),r2:r2*sign); encoder.setBytes(&params,length:MemoryLayout<Params>.stride,index:3)
            let width=min(256,pipeline.maxTotalThreadsPerThreadgroup)
            encoder.dispatchThreads(MTLSize(width:n*n*n,height:1,depth:1),threadsPerThreadgroup:MTLSize(width:width,height:1,depth:1)); encoder.endEncoding()
            let old=previous; previous=current; current=spare; spare=old; step += 1
        }
        command.commit(); command.waitUntilCompleted()
        try check(command.status == .completed, command.error?.localizedDescription ?? "GPU command failed")
    }
    func values() -> [Float] { Array(UnsafeBufferPointer(start:current.contents().bindMemory(to:Float.self,capacity:n*n*n),count:n*n*n)) }
    func checkpoint(_ directory: URL, signature: String) throws {
        try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        let name="state-"+UUID().uuidString+".bin", file=directory.appendingPathComponent(name)
        var bytes=Data(bytes:current.contents(),count:n*n*n*4); bytes.append(Data(bytes:previous.contents(),count:n*n*n*4))
        try bytes.write(to:file,options:.atomic)
        let metadata:[String:Any]=["format":1,"grid":n,"step":step,"r2":r2,"signature":signature,"file":name,"sha256":SHA256.hash(data:bytes).map{String(format:"%02x",$0)}.joined(),"precision":"float32 little-endian"]
        try JSONSerialization.data(withJSONObject:metadata,options:[.prettyPrinted,.sortedKeys]).write(to:directory.appendingPathComponent("checkpoint.json"),options:.atomic)
        for old in try FileManager.default.contentsOfDirectory(at:directory,includingPropertiesForKeys:nil) where old.lastPathComponent.hasPrefix("state-") && old.lastPathComponent != name { try FileManager.default.removeItem(at:old) }
    }
    func restore(_ directory: URL, signature: String) throws {
        let object=try JSONSerialization.jsonObject(with:Data(contentsOf:directory.appendingPathComponent("checkpoint.json"))) as! [String:Any]
        try check(object["format"] as? Int == 1 && object["grid"] as? Int == n && object["signature"] as? String == signature && abs((object["r2"] as? Double ?? -1)-Double(r2))<1e-8,"Checkpoint grid, numerical settings or source signature changed")
        guard let name=object["file"] as? String, name.range(of:"^state-[A-Fa-f0-9-]+\\.bin$",options:.regularExpression) != nil else { throw NSError(domain:"Checkpoint filename",code:1) }
        let bytes=try Data(contentsOf:directory.appendingPathComponent(name))
        try check(bytes.count == n*n*n*8 && SHA256.hash(data:bytes).map{String(format:"%02x",$0)}.joined() == object["sha256"] as? String,"Checkpoint data is damaged")
        bytes.withUnsafeBytes { raw in current.contents().copyMemory(from:raw.baseAddress!,byteCount:n*n*n*4); previous.contents().copyMemory(from:raw.baseAddress!.advanced(by:n*n*n*4),byteCount:n*n*n*4) }
        guard let saved=object["step"] as? Int, saved>=0 else { throw NSError(domain:"Checkpoint step",code:1) }; step=saved
    }
}
func maxError(_ a: [Float], _ b: [Double]) throws -> Double {
    try check(a.count==b.count && a.allSatisfy{$0.isFinite} && b.allSatisfy{$0.isFinite},"Nonfinite or mismatched field")
    return zip(a,b).map{abs(Double($0)-$1)}.max() ?? 0
}
do {
    guard let device=MTLCreateSystemDefaultDevice() else { throw NSError(domain:"Metal unavailable",code:1) }
    try check(device.name.contains("Apple"),"This backend requires an Apple GPU; no CPU fallback will be labeled GPU")
    let options=MTLCompileOptions(); options.fastMathEnabled=false
    let library=try device.makeLibrary(source:shader,options:options)
    let pipeline=try device.makeComputePipelineState(function:library.makeFunction(name:"wave")!)
    let args=CommandLine.arguments
    func arg(_ name: String, _ fallback: String) -> String { if let i=args.firstIndex(of:name), i+1<args.count { return args[i+1] }; return fallback }
    let directory=URL(fileURLWithPath:arg("--checkpoint",NSTemporaryDirectory()+"genchase-metal"))
    let signature=arg("--signature","standalone")
    if args.contains("--verify") {
        let n=16, steps=37, r2:Float=0.16
        let (u,p)=startState(n,r2), reference=cpu(u,p,n,r2,steps)
        let straight=try Wave(device:device,pipeline:pipeline,n:n); try straight.advance(steps)
        let error=try maxError(straight.values(),reference); try check(error<5e-5,"CPU/GPU error exceeds 5e-5")
        let split=try Wave(device:device,pipeline:pipeline,n:n); try split.advance(13); try split.checkpoint(directory,signature:signature)
        let resumed=try Wave(device:device,pipeline:pipeline,n:n); try resumed.restore(directory,signature:signature); try resumed.advance(steps-resumed.step)
        let resumeError=try maxError(resumed.values(),straight.values().map(Double.init)); try check(resumeError==0,"Checkpoint/resume changes GPU field")
        let wrong=try Wave(device:device,pipeline:pipeline,n:n); try wrong.advance(3,sign:-1)
        let wrongError=try maxError(wrong.values(),cpu(u,p,n,r2,3)); try check(wrongError>1e-3,"Wrong-sign control failed")
        var convergence:[[String:Any]]=[], errors:[Double]=[]
        for size in [8,16,32] {
            let wave=try Wave(device:device,pipeline:pipeline,n:size); try wave.advance(size/4)
            let factor=cos(2*Double.pi*sqrt(6.0)*0.1)
            let error=try maxError(wave.values(),initial(size).map{Double($0)*factor}); errors.append(error)
            convergence.append(["grid":size,"steps":size/4,"physicalTime":0.1,"maxError":error])
        }
        let orders=[log2(errors[0]/errors[1]),log2(errors[1]/errors[2])]; try check(orders.allSatisfy{$0>1.7 && $0<2.3},"Continuum refinement not second order")
        emit(["type":"verification","device":device.name,"passed":true,"grid":n,"steps":steps,"cpuFloat64MaxError":error,"tolerance":5e-5,"checkpointMaxDifference":resumeError,"wrongSignDifference":wrongError,"convergence":convergence,"orders":orders,"telemetry":telemetry(),"scope":"Periodic unit-cube scalar wave; float32 Metal versus float64 CPU; finite fixtures, not validation of every module or physical acoustics."])
    } else {
        let n=Int(arg("--grid","128")) ?? 0, target=Int(arg("--steps","1000")) ?? 0
        try check([32,64,128,192,256].contains(n) && target>0 && target<=100000000,"Unsupported grid or step budget")
        let wave=try Wave(device:device,pipeline:pipeline,n:n)
        if args.contains("--resume") { try wave.restore(directory,signature:signature) }
        try check(wave.step<=target,"Checkpoint is beyond requested end")
        emit(["type":"device","device":device.name,"grid":n,"targetSteps":target,"startStep":wave.step,"precision":"float32","bound":"dt/dx=0.4 < 1/sqrt(3)"])
        var lastSave=Date.distantPast
        while wave.step<target {
            try wave.advance(min(8,target-wave.step))
            if Date().timeIntervalSince(lastSave)>=10 || wave.step==target {
                try check(wave.values().allSatisfy{$0.isFinite},"Nonfinite field")
                try wave.checkpoint(directory,signature:signature); lastSave=Date()
                emit(["type":"progress","done":wave.step,"total":target,"telemetry":telemetry()])
            }
        }
        emit(["type":"complete","device":device.name,"steps":wave.step,"checkpoint":directory.path,"maximumMagnitude":wave.values().map{abs($0)}.max() ?? 0])
    }
} catch { fputs("Metal job failed: \(error.localizedDescription)\n",stderr); exit(1) }
