// Load modules

var Hapi = require('hapi');
var Lab = require('lab');
var Ws = require('ws');
var Tv = require('../');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


it('reports a request event', function (done) {

    var server = new Hapi.Server(0);

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply('1');
        }
    });

    server.pack.register({ plugin: Tv, options: { port: 0 } }, function (err) {

        expect(err).to.not.exist;

        server.inject('/debug/console', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.contain('Debug Console');

            var host = res.result.match(/var host = '([^']+)'/)[1];
            var port = res.result.match(/var port = (\d+)/)[1];
            var ws = new Ws('ws://' + host + ':' + port);

            ws.once('open', function () {

                ws.send('*');

                setTimeout(function () {

                    server.inject('/?debug=123', function (res) {

                        expect(res.result).to.equal('1');
                    });
                }, 100);
            });

            ws.once('message', function (data, flags) {

                expect(JSON.parse(data).data.agent).to.equal('shot');
                done();
            });
        });
    });
});

it('handles reconnects gracefully', function (done) {

    var server = new Hapi.Server(0);

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply('1');
        }
    });

    server.pack.register({ plugin: Tv, options: { port: 0, host: 'localhost' }}, function (err) {

        expect(err).to.not.exist;

        server.inject('/debug/console', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.contain('Debug Console');

            var host = res.result.match(/var host = '([^']+)'/)[1];
            var port = res.result.match(/var port = (\d+)/)[1];
            var ws1 = new Ws('ws://' + host + ':' + port);

            ws1.once('open', function () {

                ws1.send('*');
                ws1.close();
                var ws2 = new Ws('ws://' + host + ':' + port);

                ws2.once('open', function () {

                    ws2.send('*');
                    setTimeout(function () {

                        server.inject('/?debug=123', function (res) {

                            expect(res.result).to.equal('1');
                        });
                    }, 100);
                });

                // Shouldn't get called
                ws2.once('message', function (data, flags) {

                    expect(JSON.parse(data).data.agent).to.equal('shot');
                    done();
                });
            });
        });
    });
});

it('uses specified hostname', function (done) {

    var server = new Hapi.Server(0);

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply('1');
        }
    });

    server.pack.register({plugin: Tv, options: { host: '127.0.0.1', port: 0 } }, function (err) {

        expect(err).to.not.exist;
        done();
    });
});

it('uses specified public hostname', function (done) {

    var server = new Hapi.Server(0);

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply('1');
        }
    });

    server.pack.register({ plugin: Tv, options: { port: 0, host: 'localhost', publicHost: '127.0.0.1' }}, function (err) {

        expect(err).to.not.exist;

        server.inject('/debug/console', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.contain('Debug Console');

            var host = res.result.match(/var host = '([^']+)'/)[1];

            expect(host).to.equal('127.0.0.1');
            done();

        });
    });
});
