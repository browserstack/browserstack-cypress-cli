'use strict';
const chai = require("chai"),
  expect = chai.expect,
  sinon = require("sinon"),
  EventEmitter = require('events');

const logger = require("../../../../bin/helpers/logger").winstonLogger;

const cp = require("child_process");
const fs = require("fs");
const utils = require("../../../../bin/helpers/utils");
const  readCypressConfigUtil = require("../../../../bin/helpers/readCypressConfigUtil");

logger.transports["console.info"].silent = true;


describe("readCypressConfigUtil", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        sinon.restore();
    });

    describe('detectLanguage', () => {
        it('should return file extension', () => {
            const result =  readCypressConfigUtil.detectLanguage('cypress.config.ts');
            expect(result).to.eql('ts');
        });

        it('should return file js extension if not matched with defined ones', () => {
            const result =  readCypressConfigUtil.detectLanguage('cypress.config.mts');
            expect(result).to.eql('js');
        });
    });

    describe('loadJsFile', () => {
        it('should load js file', () => {
            sandbox.stub(cp, "execSync").returns("random string");
            const readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns('{"e2e": {}}');
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(true);
            const unlinkSyncSyncStub = sandbox.stub(fs, 'unlinkSync');
            
            const result =  readCypressConfigUtil.loadJsFile('path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql({ e2e: {} });
            sinon.assert.calledOnce(readFileSyncStub);
            sinon.assert.calledOnce(unlinkSyncSyncStub);
            sinon.assert.calledOnce(existsSyncStub);
        });
    });

    describe('convertTsConfig', () => {
        it('should compile cypress.config.ts to cypress.config.js', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            sandbox.stub(cp, "execSync").returns("TSFILE: path/to/compiled/cypress.config.js");
            
            const result =  readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql('path/to/compiled/cypress.config.js');
        });

        it('should return null if compilation fails', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            sandbox.stub(cp, "execSync").returns("Error: some error\n");
            
            const result =  readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql(null);
        });

        it('should compile cypress.config.ts to cypress.config.js if unrelevant error', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/folder/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const execSyncStub = sandbox.stub(cp, "execSync")
            execSyncStub
                .withArgs(`NODE_PATH=path/to/tmpBstackPackages path/to/tmpBstackPackages/typescript/bin/tsc --outDir path/to/tmpBstackCompiledJs --listEmittedFiles true --allowSyntheticDefaultImports --module commonjs --declaration false path/to/cypress.config.ts`, { cwd: 'path/to' })
                .throws({
                    output: Buffer.from("Error: Some Error \n TSFILE: path/to/compiled/cypress.config.js")
                });
            
            const result =  readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql('path/to/compiled/cypress.config.js');
        });
    });

    describe('readCypressConfigFile', () => {
        it('should read js file', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.js',
                    cypress_config_filename: 'cypress.config.js'
                }
            };
            sandbox.stub(readCypressConfigUtil, 'loadJsFile').returns({e2e: {}});
            sandbox.stub(cp, 'execSync');

            const result =  readCypressConfigUtil.readCypressConfigFile(bsConfig);

            expect(result).to.eql({ e2e: {} });
        });

        it('should read ts file', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            sandbox.stub(readCypressConfigUtil, 'convertTsConfig').returns('path/to/compiled/cypress.config.js');
            sandbox.stub(readCypressConfigUtil, 'loadJsFile').returns({e2e: {}});
            sandbox.stub(cp, 'execSync');

            const result =  readCypressConfigUtil.readCypressConfigFile(bsConfig);

            expect(result).to.eql({ e2e: {} });
        });

        it('should handle error if any error occurred', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.js',
                    cypress_config_filename: 'cypress.config.js'
                }
            };
            sandbox.stub(readCypressConfigUtil, 'loadJsFile').throws(new Error("Some error"));
            const sendUsageReportStub = sandbox.stub(utils, 'sendUsageReport');
            sandbox.stub(cp, 'execSync');

            const result =  readCypressConfigUtil.readCypressConfigFile(bsConfig);

            expect(result).to.eql(undefined);
            sinon.assert.calledWithExactly(sendUsageReportStub, {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.js',
                    cypress_config_filename: 'cypress.config.js'
                }
            }, null, 'Error while reading cypress config: Some error', 'warning','cypress_config_file_read_failed', null, null)
        });
    });
});
