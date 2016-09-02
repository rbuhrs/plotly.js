var Plotly = require('@lib/index');
var PlotlyInternal = require('@src/plotly');
var Lib = require('@src/lib');

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var fail = require('../assets/fail_test');
var delay = require('../assets/delay');

var mock = require('@mocks/animation');

function runTests(duration) {
    describe('Test animate API (frame duration = ' + duration + ')', function() {
        'use strict';

        var gd, mockCopy;
        var transOpts = {frameduration: duration};

        function verifyQueueEmpty(gd) {
            expect(gd._transitionData._frameQueue.length).toEqual(0);
        }

        function verifyFrameTransitionOrder(gd, expectedFrames) {
            var calls = PlotlyInternal.transition.calls;

            expect(calls.count()).toEqual(expectedFrames.length);

            for(var i = 0; i < calls.count(); i++) {
                expect(calls.argsFor(i)[1]).toEqual(
                    gd._transitionData._frameHash[expectedFrames[i]].data
                );
            }
        }

        beforeEach(function(done) {
            gd = createGraphDiv();

            mockCopy = Lib.extendDeep({}, mock);

            spyOn(PlotlyInternal, 'transition').and.callFake(function() {
                // Transition's fake behaviro is to resolve after a short period of time:
                return Promise.resolve().then(delay(duration));
            });

            Plotly.plot(gd, mockCopy.data, mockCopy.layout).then(function() {
                Plotly.addFrames(gd, mockCopy.frames);
            }).then(done);
        });

        afterEach(function() {
            // *must* purge between tests otherwise dangling async events might not get cleaned up properly:
            Plotly.purge(gd);
            destroyGraphDiv();
        });

        it('animates to a frame', function(done) {
            Plotly.animate(gd, ['frame0'], {duration: 1.2345}).then(function() {
                expect(PlotlyInternal.transition).toHaveBeenCalled();

                var args = PlotlyInternal.transition.calls.mostRecent().args;

                // was called with gd, data, layout, traceIndices, transitionConfig:
                expect(args.length).toEqual(5);

                // data has two traces:
                expect(args[1].length).toEqual(2);

                // Verify transition config has been passed:
                expect(args[4].duration).toEqual(1.2345);

                // layout
                expect(args[2]).toEqual({
                    xaxis: {range: [0, 2]},
                    yaxis: {range: [0, 10]}
                });

                // traces are [0, 1]:
                expect(args[3]).toEqual([0, 1]);
            }).catch(fail).then(done);
        });

        it('rejects if a frame is not found', function(done) {
            Plotly.animate(gd, ['foobar'], transOpts).then(fail).then(done, done);
        });

        it('animates to a single frame', function(done) {
            Plotly.animate(gd, ['frame0'], transOpts).then(function() {
                expect(PlotlyInternal.transition.calls.count()).toEqual(1);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('animates to a list of frames', function(done) {
            Plotly.animate(gd, ['frame0', 'frame1'], transOpts).then(function() {
                expect(PlotlyInternal.transition.calls.count()).toEqual(2);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('animates frames by group', function(done) {
            Plotly.animate(gd, 'even-frames', transOpts).then(function() {
                expect(PlotlyInternal.transition.calls.count()).toEqual(2);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('animates groups in the correct order', function(done) {
            Plotly.animate(gd, 'even-frames', transOpts);
            Plotly.animate(gd, 'odd-frames', transOpts).then(function() {
                verifyFrameTransitionOrder(gd, ['frame0', 'frame2', 'frame1', 'frame3']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('drops queued frames when immediate = true', function(done) {
            Plotly.animate(gd, 'even-frames', transOpts);
            Plotly.animate(gd, 'odd-frames', transOpts, {immediate: true}).then(function() {
                verifyFrameTransitionOrder(gd, ['frame0', 'frame1', 'frame3']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('animates frames in the correct order', function(done) {
            Plotly.animate(gd, ['frame0', 'frame2', 'frame1', 'frame3'], transOpts).then(function() {
                verifyFrameTransitionOrder(gd, ['frame0', 'frame2', 'frame1', 'frame3']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('animates frames and groups in sequence', function(done) {
            Plotly.animate(gd, 'even-frames', transOpts);
            Plotly.animate(gd, ['frame0', 'frame2', 'frame1', 'frame3'], transOpts).then(function() {
                verifyFrameTransitionOrder(gd, ['frame0', 'frame2', 'frame0', 'frame2', 'frame1', 'frame3']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('accepts a single transitionOpts', function(done) {
            Plotly.animate(gd, ['frame0', 'frame1'], {duration: 1.12345}).then(function() {
                var calls = PlotlyInternal.transition.calls;
                expect(calls.argsFor(0)[4].duration).toEqual(1.12345);
                expect(calls.argsFor(1)[4].duration).toEqual(1.12345);
            }).catch(fail).then(done);
        });

        it('accepts an array of transitionOpts', function(done) {
            Plotly.animate(gd, ['frame0', 'frame1'], [{duration: 1.123}, {duration: 1.456}]).then(function() {
                var calls = PlotlyInternal.transition.calls;
                expect(calls.argsFor(0)[4].duration).toEqual(1.123);
                expect(calls.argsFor(1)[4].duration).toEqual(1.456);
            }).catch(fail).then(done);
        });

        it('falls back to transitionOpts[0] if not enough supplied in array', function(done) {
            Plotly.animate(gd, ['frame0', 'frame1'], [{duration: 1.123}]).then(function() {
                var calls = PlotlyInternal.transition.calls;
                expect(calls.argsFor(0)[4].duration).toEqual(1.123);
                expect(calls.argsFor(1)[4].duration).toEqual(1.123);
            }).catch(fail).then(done);
        });

        it('chains animations as promises', function(done) {
            Plotly.animate(gd, ['frame0', 'frame1'], transOpts).then(function() {
                return Plotly.animate(gd, ['frame2', 'frame3'], transOpts);
            }).then(function() {
                verifyFrameTransitionOrder(gd, ['frame0', 'frame1', 'frame2', 'frame3']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('emits plotly_animated before the promise is resolved', function(done) {
            var animated = false;
            gd.on('plotly_animated', function() { animated = true; });

            Plotly.animate(gd, ['frame0'], transOpts).then(function() {
                expect(animated).toBe(true);
            }).catch(fail).then(done);
        });

        it('emits plotly_animated as each animation in a sequence completes', function(done) {
            var completed = 0;
            var test1 = 0, test2 = 0;
            gd.on('plotly_animated', function() {
                completed++;
                if(completed === 1) {
                    // Verify that after the first plotly_animated, precisely frame0 and frame1
                    // have been transitioned to:
                    verifyFrameTransitionOrder(gd, ['frame0', 'frame1']);
                    test1++;
                } else {
                    // Verify that after the second plotly_animated, precisely all frames
                    // have been transitioned to:
                    verifyFrameTransitionOrder(gd, ['frame0', 'frame1', 'frame2', 'frame3']);
                    test2++;
                }
            });

            Plotly.animate(gd, ['frame0', 'frame1'], transOpts).then(function() {
                return Plotly.animate(gd, ['frame2', 'frame3'], transOpts);
            }).then(function() {
                // Verify both behaviors were actually tested:
                expect(test1).toBe(1);
                expect(test2).toBe(1);
            }).catch(fail).then(done);
        });

        it('rejects when an animation is interrupted', function(done) {
            var interrupted = false;
            Plotly.animate(gd, ['frame0', 'frame1'], transOpts).then(fail, function() {
                interrupted = true;
            });

            Plotly.animate(gd, ['frame2'], transOpts, {immediate: true}).then(function() {
                expect(interrupted).toBe(true);
                verifyFrameTransitionOrder(gd, ['frame0', 'frame2']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('emits plotly_animationinterrupted when an animation is interrupted', function(done) {
            var interrupted = false;
            gd.on('plotly_animationinterrupted', function() {
                interrupted = true;
            });

            Plotly.animate(gd, ['frame0', 'frame1'], transOpts);

            Plotly.animate(gd, ['frame2'], transOpts, {immediate: true}).then(function() {
                expect(interrupted).toBe(true);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('queues successive animations', function(done) {
            var starts = 0;
            var ends = 0;

            gd.on('plotly_animating', function() {
                starts++;
            }).on('plotly_animated', function() {
                ends++;
                expect(PlotlyInternal.transition.calls.count()).toEqual(4);
                expect(starts).toEqual(1);
            });

            Plotly.animate(gd, 'even-frames', transOpts);
            Plotly.animate(gd, 'odd-frames', transOpts).then(delay(10)).then(function() {
                expect(ends).toEqual(1);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });

        it('resolves at the end of each animation sequence', function(done) {
            Plotly.animate(gd, 'even-frames', transOpts).then(function() {
                return Plotly.animate(gd, ['frame0', 'frame2', 'frame1', 'frame3'], transOpts);
            }).then(function() {
                verifyFrameTransitionOrder(gd, ['frame0', 'frame2', 'frame0', 'frame2', 'frame1', 'frame3']);
                verifyQueueEmpty(gd);
            }).catch(fail).then(done);
        });
    });
}

for(var i = 0; i < 2; i++) {
    // Set a duration:
    var d = 30 * i;

    runTests(d);
}
