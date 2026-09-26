# wrapper: run the author's boot.py with cx.NBIN overridden (main data only; bins recomputed by load_real('main'))
import sys, runpy
import cx
cx.NBIN = int(sys.argv.pop(1))
sys.argv[0] = 'boot.py'
runpy.run_path('boot.py', run_name='__main__')
