# ring_flow_azero.cpp vs ring_flow_zero_pruned.cpp

Declared scope: include/typedef rename ZeroPrunedSparseMap→AZeroPrunedSparseMap + provenance header comments.
ZeroPruned production TU untouched.

```
--- /Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-study/tissue-scalability-preflight/ring_flow_zero_pruned.cpp	2026-09-30 06:57:12
+++ /Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-study/tissue-scalability-preflight/ring_flow_azero.cpp	2026-09-30 10:06:36
@@ -1,5 +1,8 @@
+// Isolated A-zero C1 flow TU. Uses AZeroPrunedSparseMap (sparse override).
+// DO NOT replace production ZeroPruned headers. NOT admitted for proof.
+// Derived from ring_flow_zero_pruned.cpp by typedef/include rename only.
 // Rigorous flow attempt. Existence and stability require a separate checker.
-#include "ZeroPrunedSparseMap.hpp"
+#include "AZeroPrunedSparseMap.hpp"
 #include "capd/dynsys/OdeSolver.hpp"
 #include <atomic>
 #include <thread>
@@ -16,7 +19,7 @@
 using I=interval;
 constexpr int END=18*(N-1);
 static_assert((N==32||N==64)&&DIM==18*N,"matched complete large ring required");
-using FlowSolver=capd::dynsys::OdeSolver<ZeroPrunedSparseMap>;
+using FlowSolver=capd::dynsys::OdeSolver<AZeroPrunedSparseMap>;
 class ResourceWatch{std::atomic<bool> done{false};std::thread watcher;public:explicit ResourceWatch(unsigned long long limit):watcher([this,limit]{while(!done){rusage r{};getrusage(RUSAGE_SELF,&r);
 #ifdef __APPLE__
 unsigned long long rss=r.ru_maxrss;
@@ -33,10 +36,10 @@
 static std::string domain(const IVector& y){std::ostringstream o;o<<'[';bool first=true;for(int j=0;j<N;++j){IVector local(18);for(int i=0;i<18;++i){local[i]=y[18*j+i];if(!std::isfinite(local[i].leftBound())||!std::isfinite(local[i].rightBound()))throw std::runtime_error("nonfinite physical tube");}for(int i=14;i<18;++i)if(local[i].leftBound()<=0)throw std::runtime_error("positive concentration domain lost");if(local[0].contains(15.0))throw std::runtime_error("literal V15 pole exclusion lost");std::vector<I> guards;auditModelDomain(local,&guards);if(guards.size()!=137)throw std::runtime_error("domain guard count");for(int i=0;i<137;++i){if(!first)o<<',';first=false;o<<"{\"site\":"<<j<<",\"index\":"<<i+1<<",\"range\":"<<bounds(guards[i])<<'}';}}o<<']';return o.str();}
 struct Data{int steps=0;I end{0};IVector initial{DIM},image{DIM},field{DIM};IMatrix derivative{DIM,DIM};I time{0},initialSlope{0},endSlope{0};bool success=false;};
 class AuditedSolver:public FlowSolver{
- Data& data;ZeroPrunedSparseMap& field;std::ofstream& log;std::chrono::steady_clock::time_point began;double budget;
+ Data& data;AZeroPrunedSparseMap& field;std::ofstream& log;std::chrono::steady_clock::time_point began;double budget;
  template<class Set>void record(const Set& result){IVector normalized=result.getLastEnclosure(),tube=physical(normalized);I t=result.getCurrentTime();++data.steps;data.end=t;std::string guards=domain(tube);I slope=field(normalized)[END],sign=tube[END]-I(1)/I(5);if(sign.contains(0.0)&&slope.contains(0.0))throw std::runtime_error("end-section transversality lost on whole step");log<<"{\"stepIndex\":"<<data.steps<<",\"timeStart\":"<<bounds(t-getStep())<<",\"timeEnd\":"<<bounds(t)<<",\"step\":"<<bounds(getStep())<<",\"physicalTube\":"<<vec(tube)<<",\"domainGuards\":"<<guards<<",\"sectionRange\":"<<bounds(sign)<<",\"sectionSlope\":"<<bounds(slope)<<",\"domainChecksPassed\":true}\n";log.flush();if(data.steps>2000||t.rightBound()>9||std::chrono::duration<double>(std::chrono::steady_clock::now()-began).count()>budget)throw std::runtime_error("bounded rigorous flow budget exceeded");if(data.steps%5==0)std::cerr<<"steps="<<data.steps<<" t="<<t<<'\n';}
 public:
- AuditedSolver(ZeroPrunedSparseMap& f,Data& d,std::ofstream& o,int order,double seconds):FlowSolver::BaseTaylor(f,order),FlowSolver(f,order),data(d),field(f),log(o),began(std::chrono::steady_clock::now()),budget(seconds){setMaxStep(I(4)/I(N));}
+ AuditedSolver(AZeroPrunedSparseMap& f,Data& d,std::ofstream& o,int order,double seconds):FlowSolver::BaseTaylor(f,order),FlowSolver(f,order),data(d),field(f),log(o),began(std::chrono::steady_clock::now()),budget(seconds){setMaxStep(I(4)/I(N));}
  template<class Set>void operator()(Set& set){FlowSolver::operator()(set);record(set);}
  template<class Set>void operator()(Set& set,Set& result){FlowSolver::operator()(set,result);record(result);}
 };
@@ -44,7 +47,7 @@
  if(argc!=8)throw std::runtime_error("usage: --box|--point radius tube-path order budget fixed-step-or-adaptive rss-MiB");
  unsigned long long rssMiB=std::stoull(argv[7]);if(rssMiB<1024||rssMiB>8192)throw std::runtime_error("RSS budget outside cap");ResourceWatch watcher(rssMiB*1024*1024);std::string mode(argv[1]);if(mode!="--box"&&mode!="--point")throw std::runtime_error("unknown mode");bool c1=mode=="--box";I radius=mode=="--point"?I(0):I(argv[2],argv[2]);if(radius.leftBound()<0||radius.rightBound()>1e-5||(c1&&radius.leftBound()<=0)||(!c1&&radius.rightBound()!=0))throw std::runtime_error("invalid radius");int order=std::stoi(argv[4]);double seconds=std::stod(argv[5]);if(order<8||order>20||seconds>21600)throw std::runtime_error("invalid budget/order");
  if(!rounding::DoubleRounding::isWorking())throw std::runtime_error("native directed rounding check failed");I third=I(1)/I(3);if(!(third.leftBound()<third.rightBound())||!((third*I(3)-I(1)).contains(0.0))||!exp(log(I(2))).contains(2.0))throw std::runtime_error("arithmetic smoke check failed");
- ZeroPrunedSparseMap f(N);IVector s=physicalScales(),initial(DIM);I symmetric(-radius.rightBound(),radius.rightBound());for(int j=0;j<N;++j)for(int i=0;i<18;++i)initial[18*j+i]=I(CENTERS[18*j+i],CENTERS[18*j+i])/s[i]+symmetric;initial[0]=I(1)/I(5);d.initial=physical(initial);domain(d.initial);d.initialSlope=f(initial)[0];if(d.initialSlope.leftBound()<=0)throw std::runtime_error("initial section not ascending");if((initial[END]-I(1)/I(5)).rightBound()>=0)throw std::runtime_error("initial state is not strictly below end section");
+ AZeroPrunedSparseMap f(N);IVector s=physicalScales(),initial(DIM);I symmetric(-radius.rightBound(),radius.rightBound());for(int j=0;j<N;++j)for(int i=0;i<18;++i)initial[18*j+i]=I(CENTERS[18*j+i],CENTERS[18*j+i])/s[i]+symmetric;initial[0]=I(1)/I(5);d.initial=physical(initial);domain(d.initial);d.initialSlope=f(initial)[0];if(d.initialSlope.leftBound()<=0)throw std::runtime_error("initial section not ascending");if((initial[END]-I(1)/I(5)).rightBound()>=0)throw std::runtime_error("initial state is not strictly below end section");
  std::ofstream tubes(argv[3]);if(!tubes)throw std::runtime_error("tube log not writable");AuditedSolver solver(f,d,tubes,order,seconds);if(std::string(argv[6])!="adaptive")solver.setStep(I(argv[6],argv[6]));ICoordinateSection section(DIM,END,I(1)/I(5));poincare::PoincareMap<AuditedSolver> map(solver,section,poincare::MinusPlus);stage="validated end-section return";
  if(c1){C1Rect2Set set(initial);d.image=map(set,d.derivative,d.time,1);}else{C0Rect2Set set(initial);d.image=map(set,d.time,1);}
  d.field=f(d.image);d.endSlope=d.field[END];domain(physical(d.image));if(d.endSlope.leftBound()<=0||d.time.leftBound()<(I(TIME_PROPOSAL,TIME_PROPOSAL)*I(4)/I(5)).leftBound()||d.time.rightBound()>(I(TIME_PROPOSAL,TIME_PROPOSAL)*I(6)/I(5)).rightBound())throw std::runtime_error("invalid event time or endpoint transversality");d.success=true;rusage usage{};getrusage(RUSAGE_SELF,&usage);std::cerr<<"peak_rss_native="<<usage.ru_maxrss<<"\n";

```
