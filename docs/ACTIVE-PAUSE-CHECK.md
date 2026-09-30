# Explicit Pause During Export

An active technique with pending geometry must rebuild before exporting the new
settings. That rebuild must preserve an explicit Pause choice. Explicit Generate
still resumes the technique; an export is not a transport command.

The original browser reproduction queued a geometry change to 17, paused the
active fixture, then immediately exported its data. The export correctly reported
`built: 17, requested: 17`, but the fixture changed from paused to running. The
maintained engine now preserves the pause flag during the refresh and suspends
refreshed paused or hidden work when export completes.

`node tools/parameter-state-check.js` passes against the maintained build with a
180-second process cap and one installed Chrome worker. It checks active data
export, hidden-tab transport, actual PNG success and intentional exporter failure,
and explicit Generate resuming afterward. Existing controls also cover sanitized
live values, immediate pending-geometry exports and the Flow trajectory shape.

[The result record](../validation/results/active-pause-check.json) includes the
engine and test SHA-256 values, the original failing observation, retained local
log hashes, browser version, runtime cap and passing output. The local before and
after logs are `active-pause-repro.log` and `parameter-state-maintained.log` in the
workspace's `work/core-independent-review/` directory.

The data path uses `finally` to restore suspension after regeneration or data
export throws. PNG regeneration failure has a dedicated cleanup path; rendering
success, failure and cancellation share cleanup. PNG failure is exercised in the
browser. Cancellation and regeneration failure were reviewed statically here.
This bounded shell regression does not certify every module's pause implementation
or encode a running simulation's trajectory in its recipe.
