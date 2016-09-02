var Plotly = require('@lib/index');
var Lib = require('@src/lib');
var Plots = Plotly.Plots;

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var fail = require('../assets/fail_test');
var delay = require('../assets/delay');
var mock = require('@mocks/animation');


describe('Plots.supplyTransitionDefaults', function() {
    'use strict';

    it('supplies transition defaults', function() {
        expect(Plots.supplyTransitionDefaults({})).toEqual({
            frameduration: 500,
            transitionduration: 500,
            ease: 'cubic-in-out',
            redraw: true
        });
    });

    it('uses provided values', function() {
        expect(Plots.supplyTransitionDefaults({
            frameduration: 200,
            transitionduration: 100,
            ease: 'quad-in-out',
            redraw: false
        })).toEqual({
            frameduration: 200,
            transitionduration: 100,
            ease: 'quad-in-out',
            redraw: false
        });
    });

});

function runTests(transitionDuration) {
    describe('Plotly.transition (duration = ' + transitionDuration + ')', function() {
        'use strict';

        var gd;

        beforeEach(function(done) {
            gd = createGraphDiv();

            var mockCopy = Lib.extendDeep({}, mock);

            Plotly.plot(gd, mockCopy.data, mockCopy.layout).then(done);
        });

        afterEach(function() {
            Plotly.purge(gd);
            destroyGraphDiv();
        });

        it('resolves only once the transition has completed', function(done) {
            var t1 = Date.now();

            Plotly.transition(gd, null, {'xaxis.range': [0.2, 0.3]}, null, {transitionduration: transitionDuration})
                .then(delay(20))
                .then(function() {
                    expect(Date.now() - t1).toBeGreaterThan(transitionDuration);
                }).catch(fail).then(done);
        });

        it('emits plotly_transitioning on transition start', function(done) {
            var beginTransitionCnt = 0;
            gd.on('plotly_transitioning', function() { beginTransitionCnt++; });

            Plotly.transition(gd, null, {'xaxis.range': [0.2, 0.3]}, null, {transitionduration: transitionDuration})
                .then(delay(20))
                .then(function() {
                    expect(beginTransitionCnt).toBe(1);
                }).catch(fail).then(done);
        });

        it('emits plotly_transitioned on transition end', function(done) {
            var trEndCnt = 0;
            gd.on('plotly_transitioned', function() { trEndCnt++; });

            Plotly.transition(gd, null, {'xaxis.range': [0.2, 0.3]}, null, {transitionduration: transitionDuration})
                .then(delay(20))
                .then(function() {
                    expect(trEndCnt).toEqual(1);
                }).catch(fail).then(done);
        });

        // This doesn't really test anything that the above tests don't cover, but it combines
        // the behavior and attempts to ensure chaining and events happen in the correct order.
        it('transitions may be chained', function(done) {
            var currentlyRunning = 0;
            var beginCnt = 0;
            var endCnt = 0;

            gd.on('plotly_transitioning', function() { currentlyRunning++; beginCnt++; });
            gd.on('plotly_transitioned', function() { currentlyRunning--; endCnt++; });

            function doTransition() {
                return Plotly.transition(gd, [{x: [1, 2]}], null, null, {transitionduration: transitionDuration});
            }

            function checkNoneRunning() {
                expect(currentlyRunning).toEqual(0);
            }

            doTransition()
                .then(checkNoneRunning)
                .then(doTransition)
                .then(checkNoneRunning)
                .then(doTransition)
                .then(checkNoneRunning)
                .then(delay(10))
                .then(function() {
                    expect(beginCnt).toEqual(3);
                    expect(endCnt).toEqual(3);
                })
                .then(checkNoneRunning)
                .catch(fail).then(done);
        });
    });
}

for(var i = 0; i < 2; i++) {
    var duration = i * 20;
    // Run the whole set of tests twice: once with zero duration and once with
    // nonzero duration since the behavior should be identical, but there's a
    // very real possibility of race conditions or other timing issues.
    //
    // And of course, remember to put the async loop in a closure:
    runTests(duration);
}
