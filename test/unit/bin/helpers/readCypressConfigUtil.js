'use strict';
const chai = require("chai"),
  expect = chai.expect,
  sinon = require("sinon"),
  path = require('path'),
  EventEmitter = require('events'),
  rewire = require('rewire');

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
            const loadCommandStub = sandbox.stub(cp, "execSync").returns("random string");
            const readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns('{"e2e": {}}');
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(true);
            const unlinkSyncSyncStub = sandbox.stub(fs, 'unlinkSync');
            const requireModulePath = path.join(__dirname, '../../../../', 'bin', 'helpers', 'requireModule.js');
            
            const result =  readCypressConfigUtil.loadJsFile('path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql({ e2e: {} });
            sinon.assert.calledOnceWithExactly(loadCommandStub, `NODE_PATH="path/to/tmpBstackPackages" node "${requireModulePath}" "path/to/cypress.config.ts"`);
            sinon.assert.calledOnce(readFileSyncStub);
            sinon.assert.calledOnce(unlinkSyncSyncStub);
            sinon.assert.calledOnce(existsSyncStub);
        });

        it('should load js file for win', () => {
            sinon.stub(process, 'platform').value('win32');
            const loadCommandStub = sandbox.stub(cp, "execSync").returns("random string");
            const readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns('{"e2e": {}}');
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(true);
            const unlinkSyncSyncStub = sandbox.stub(fs, 'unlinkSync');
            const requireModulePath = path.join(__dirname, '../../../../', 'bin', 'helpers', 'requireModule.js');
            
            const result =  readCypressConfigUtil.loadJsFile('path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql({ e2e: {} });
            sinon.assert.calledOnceWithExactly(loadCommandStub, `set NODE_PATH=path/to/tmpBstackPackages&& node "${requireModulePath}" "path/to/cypress.config.ts"`);
            sinon.assert.calledOnce(readFileSyncStub);
            sinon.assert.calledOnce(unlinkSyncSyncStub);
            sinon.assert.calledOnce(existsSyncStub);
        });
    });

    describe('resolveTsConfigPath', () => {
        let readCypressConfigUtilRewired, resolveTsConfigPath;
        
        beforeEach(() => {
            readCypressConfigUtilRewired = rewire('../../../../bin/helpers/readCypressConfigUtil');
            resolveTsConfigPath = readCypressConfigUtilRewired.__get__('resolveTsConfigPath');
        });

        it('should return user specified tsconfig path if exists', () => {
            const bsConfig = {
                run_settings: {
                    ts_config_file_path: 'custom/tsconfig.json'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(path.resolve('custom/tsconfig.json')).returns(true);
            
            const result = resolveTsConfigPath(bsConfig, 'path/to/cypress.config.ts');
            
            expect(result).to.eql(path.resolve('custom/tsconfig.json'));
        });

        it('should return null if no tsconfig found', () => {
            const bsConfig = { run_settings: {} };
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false);
            
            const result = resolveTsConfigPath(bsConfig, 'path/to/cypress.config.ts');
            
            expect(result).to.be.null;
        });

        it('should find tsconfig in cypress config directory', () => {
            const bsConfig = { run_settings: {} };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(path.resolve('path/to/tsconfig.json')).returns(true);
            existsSyncStub.returns(false); // default behavior
            
            const result = resolveTsConfigPath(bsConfig, 'path/to/cypress.config.ts');
            
            expect(result).to.eql(path.resolve('path/to/tsconfig.json'));
        });
    });

    describe('generateTscCommandAndTempTsConfig', () => {
        let readCypressConfigUtilRewired, generateTscCommandAndTempTsConfig;
        
        beforeEach(() => {
            readCypressConfigUtilRewired = rewire('../../../../bin/helpers/readCypressConfigUtil');
            generateTscCommandAndTempTsConfig = readCypressConfigUtilRewired.__get__('generateTscCommandAndTempTsConfig');
        });

        it('should use extends approach when valid tsconfig exists', () => {
            const bsConfig = {
                run_settings: {
                    ts_config_file_path: 'existing/tsconfig.json'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(path.resolve('existing/tsconfig.json')).returns(true);
            const readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns('{}');
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            
            const result = generateTscCommandAndTempTsConfig(bsConfig, 'path/to/tmpBstackPackages', 'path/to/tmpBstackCompiledJs', 'path/to/cypress.config.ts');
            
            expect(result.tscCommand).to.include('--project');
            expect(result.tempTsConfigPath).to.include('tsconfig.singlefile.tmp.json');
            
            // Verify the temp tsconfig uses extends
            const writeCall = writeFileSyncStub.getCall(0);
            const tempConfig = JSON.parse(writeCall.args[1]);
            expect(tempConfig.extends).to.eql(path.resolve('existing/tsconfig.json'));
        });

        it('should use standalone config when no tsconfig exists', () => {
            const bsConfig = { run_settings: {} };
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false);
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            
            const result = generateTscCommandAndTempTsConfig(bsConfig, 'path/to/tmpBstackPackages', 'path/to/tmpBstackCompiledJs', 'path/to/cypress.config.ts');
            
            expect(result.tscCommand).to.include('--project');
            
            // Verify the temp tsconfig has standalone config
            const writeCall = writeFileSyncStub.getCall(0);
            const tempConfig = JSON.parse(writeCall.args[1]);
            expect(tempConfig.extends).to.be.undefined;
            expect(tempConfig.compilerOptions.module).to.eql('commonjs');
            expect(tempConfig.compilerOptions.allowSyntheticDefaultImports).to.be.true;
            expect(tempConfig.compilerOptions.target).to.eql('es2017');
        });

        it('should handle invalid tsconfig and fallback to standalone', () => {
            const bsConfig = {
                run_settings: {
                    ts_config_file_path: 'invalid/tsconfig.json'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(path.resolve('invalid/tsconfig.json')).returns(true);
            const readFileSyncStub = sandbox.stub(fs, 'readFileSync').throws(new Error('Invalid JSON'));
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            
            const result = generateTscCommandAndTempTsConfig(bsConfig, 'path/to/tmpBstackPackages', 'path/to/tmpBstackCompiledJs', 'path/to/cypress.config.ts');
            
            // Should fallback to standalone config
            const writeCall = writeFileSyncStub.getCall(0);
            const tempConfig = JSON.parse(writeCall.args[1]);
            expect(tempConfig.extends).to.be.undefined;
            expect(tempConfig.compilerOptions.module).to.eql('commonjs');
        });

        it('should generate Windows command correctly', () => {
            sinon.stub(process, 'platform').value('win32');
            const bsConfig = { run_settings: {} };
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false);
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            
            const result = generateTscCommandAndTempTsConfig(bsConfig, 'path/to/tmpBstackPackages', 'path/to/tmpBstackCompiledJs', 'path/to/cypress.config.ts');
            
            expect(result.tscCommand).to.include('set NODE_PATH=');
            expect(result.tscCommand).to.include('&&');
        });

        it('should generate Unix command correctly', () => {
            sinon.stub(process, 'platform').value('linux');
            const bsConfig = { run_settings: {} };
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false);
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            
            const result = generateTscCommandAndTempTsConfig(bsConfig, 'path/to/tmpBstackPackages', 'path/to/tmpBstackCompiledJs', 'path/to/cypress.config.ts');
            
            expect(result.tscCommand).to.include('NODE_PATH=path/to/tmpBstackPackages');
            expect(result.tscCommand).to.include('tsc-alias');
        });
    });

    describe('convertTsConfig', () => {
        it('should compile cypress.config.ts to cypress.config.js with new approach', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false); // for tsconfig search
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            const compileTsStub = sandbox.stub(cp, "execSync").returns("TSFILE: path/to/compiled/cypress.config.js");
            
            const result = readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql('path/to/compiled/cypress.config.js');
            
            // Verify temp tsconfig was created and cleaned up
            sinon.assert.calledOnce(writeFileSyncStub);
            sinon.assert.calledOnce(unlinkSyncStub);
            
            // Verify command uses --project flag
            const tscCommand = compileTsStub.getCall(0).args[0];
            expect(tscCommand).to.include('--project');
            expect(tscCommand).to.include('tsconfig.singlefile.tmp.json');
        });

        it('should compile cypress.config.ts to cypress.config.js for Windows with new approach', () => {
            sinon.stub(process, 'platform').value('win32');
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false);
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            const compileTsStub = sandbox.stub(cp, "execSync").returns("TSFILE: path/to/compiled/cypress.config.js");
            
            const result = readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql('path/to/compiled/cypress.config.js');
            
            // Verify Windows command format
            const tscCommand = compileTsStub.getCall(0).args[0];
            expect(tscCommand).to.include('set NODE_PATH=');
            expect(tscCommand).to.include('&&');
        });

        it('should return null if compilation fails with new approach', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false);
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            sandbox.stub(cp, "execSync").returns("Error: some error\n");
            
            const result = readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql(null);
            
            // Verify cleanup still happens
            sinon.assert.calledOnce(unlinkSyncStub);
        });

        it('should compile cypress.config.ts to cypress.config.js if irrelevant error with new approach', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/folder/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false);
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            const execSyncStub = sandbox.stub(cp, "execSync");
            
            execSyncStub.throws({
                output: Buffer.from("Error: Some Error \n TSFILE: path/to/compiled/cypress.config.js")
            });
            
            const result = readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql('path/to/compiled/cypress.config.js');
            
            // Verify cleanup happens even on error
            sinon.assert.calledOnce(unlinkSyncStub);
        });

        it('should preserve backwards compatibility with fallback configuration', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false); // No existing tsconfig
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            const compileTsStub = sandbox.stub(cp, "execSync").returns("TSFILE: path/to/compiled/cypress.config.js");
            
            const result = readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.eql('path/to/compiled/cypress.config.js');
            
            // Verify the temp config contains all old command-line parameters
            const writeCall = writeFileSyncStub.getCall(0);
            const tempConfig = JSON.parse(writeCall.args[1]);
            const compilerOptions = tempConfig.compilerOptions;
            
            expect(compilerOptions.allowSyntheticDefaultImports).to.be.true;
            expect(compilerOptions.module).to.eql('commonjs');
            expect(compilerOptions.declaration).to.be.false;
            expect(compilerOptions.listEmittedFiles).to.be.true;
            expect(compilerOptions.target).to.eql('es2017');
            expect(compilerOptions.moduleResolution).to.eql('node');
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

    describe('Edge Cases and Error Scenarios', () => {
        it('should handle missing typescript package gracefully', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false);
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            const execSyncStub = sandbox.stub(cp, "execSync").throws(new Error('typescript not found'));
            
            const result = readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            expect(result).to.be.null;
            sinon.assert.calledOnce(unlinkSyncStub); // Cleanup should still happen
        });

        it('should handle temp file creation failure', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false);
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync').throws(new Error('Permission denied'));
            
            expect(() => {
                readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            }).to.throw('Permission denied');
        });

        it('should handle execution correctly without duplication', () => {
            const bsConfig = {
                run_settings: {
                    cypressConfigFilePath: 'path/to/cypress.config.ts',
                    cypress_config_filename: 'cypress.config.ts'
                }
            };
            const existsSyncStub = sandbox.stub(fs, 'existsSync');
            existsSyncStub.withArgs(sinon.match(/tsconfig\.singlefile\.tmp\.json/)).returns(true);
            existsSyncStub.returns(false);
            
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
            const unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
            const execSyncStub = sandbox.stub(cp, "execSync").returns("TSFILE: path/to/compiled/cypress.config.js");
            
            readCypressConfigUtil.convertTsConfig(bsConfig, 'path/to/cypress.config.ts', 'path/to/tmpBstackPackages');
            
            // Verify execSync is called only once (fixed duplicate execution issue)
            expect(execSyncStub.callCount).to.eql(1);
        });
    });
});
