const chai = require("chai"),
  expect = chai.expect,
  assert = chai.assert,
  sinon = require("sinon"),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require("rewire");

let timeComponents = rewire('../../../../bin/helpers/timeComponents');

let initTimeComponents = timeComponents.__get__('initTimeComponents');
let instrumentEventTime = timeComponents.__get__('instrumentEventTime');
let markBlockStart = timeComponents.__get__('markBlockStart');
let markBlockEnd = timeComponents.__get__('markBlockEnd');
let markBlockDiff = timeComponents.__get__('markBlockDiff');
let getTimeComponents = timeComponents.__get__('getTimeComponents');
let convertDotToNestedObject = timeComponents.__get__('convertDotToNestedObject');

describe('timeComponents', () => {
  describe('initTimeComponents', () => {
    it('should set reset sessionTimes object', () => {
      timeComponents.__set__('sessionTimes', { someEvent: 100 });
      initTimeComponents();
      let sessionTimes = timeComponents.__get__('sessionTimes');
      expect(Object.keys(sessionTimes.logTimes).length).to.equal(0);
    });
  });

  describe('instrumentEventTime', () => {
    it('should set reset sessionTimes object', () => {
      initTimeComponents();
      instrumentEventTime('cliTest');
      let sessionTimes = timeComponents.__get__('sessionTimes');
      expect(Object.keys(sessionTimes.eventTime)).to.include('cliTest');
    });
  });

  describe('markBlockStart', () => {
    it('should add key to reference times', () => {
      initTimeComponents();
      markBlockStart('sampleBlock');
      let sessionTimes = timeComponents.__get__('sessionTimes');
      expect(Object.keys(sessionTimes.referenceTimes)).to.include('sampleBlock');
    });
  });

  describe('markBlockEnd', () => {
    let markBlockDiffUnset, markBlockDiffStub;
    beforeEach(() => {
      markBlockDiffStub = sinon.stub();
      markBlockDiffUnset = timeComponents.__set__('markBlockDiff', markBlockDiffStub);
      sinon.stub(Date, 'now').returns(100);
    });

    afterEach(() => {
      markBlockDiffUnset();
      Date.now.restore();
    });

    it('should call markBlockDiff with start and stop time', () => {
      let sessionTimes = {
        referenceTimes: {
          sampleBlock: 50,
          absoluteStartTime: 0
        },
        logTimes: {}
      };
      timeComponents.__set__('sessionTimes', sessionTimes);
      markBlockEnd('sampleBlock');
      expect(markBlockDiffStub.getCall(0).args).to.deep.equal([ 'sampleBlock', 50, 100 ]);
    });

    it('should use absolute start time as start time if block reference not found', () => {
      let sessionTimes = {
        referenceTimes: {
          absoluteStartTime: 0
        },
        logTimes: {}
      };
      timeComponents.__set__('sessionTimes', sessionTimes);
      markBlockEnd('sampleBlock');
      expect(markBlockDiffStub.getCall(0).args).to.deep.equal([ 'sampleBlock', 0, 100 ]);
    });
  });

  describe('markBlockDiff', () => {
    it('should push time difference to logTimes', () => {
      markBlockDiff = timeComponents.__get__('markBlockDiff');
      timeComponents.initTimeComponents();
      markBlockDiff('sampleBlock', 16, 64);
      let sessionTimes = timeComponents.__get__('sessionTimes');
      expect(sessionTimes.logTimes.sampleBlock).to.equal(48);
    });
  });

  describe('getTimeComponents', () => {
    it('should call convertDotToNestedObject and return data', () => {
      let convertDotToNestedObjectStub = sinon.stub().returns({sampleBlock: 100}),
        convertDotToNestedObjectUnset = timeComponents.__set__('convertDotToNestedObject', convertDotToNestedObjectStub);
      expect(getTimeComponents()).to.deep.equal({sampleBlock:100});

      convertDotToNestedObjectUnset();
    });
  });

  describe('convertDotToNestedObject', () => {
    let inputs = [
      {},
      {sampleBlock:10},
      {blockA:10,blockB:20},
      {block1:10,block2:20,block3:30,block4:40,block5:50},
      {'blockA.blockB':20},
      {'block1.block2.block3.block4.block5': 50},
      {block1:10,'block2.block3':20},
      {block1:10,'block2.block3':30,'block2.block4':40},
      {'block1.block2':10,'block2':20,'block1.block2.block3':30,'block2.block3':30,block4:40},
      {'block1.block2':10, 'block1.block3':20, 'block1':20}
    ];
    let outputs = [
      {},
      {sampleBlock:10},
      {blockA:10,blockB:20},
      {block1:10,block2:20,block3:30,block4:40,block5:50},
      {blockA:{blockB:20}},
      {block1:{block2:{block3:{block4:{block5:50}}}}},
      {block1:10,block2:{block3:20}},
      {block1:10, block2:{block3:30,block4:40}},
      {block1:{block2:{total:10,block3:30}},block2:{total:20,block3:30},block4:40},
      {block1:{block2:10,block3:20,total:20}}
    ];
    
    it('should convert dotted object to nested object', () => {
      for(let i = 0; i < inputs.length; i++) {
        expect(convertDotToNestedObject(inputs[i])).to.deep.equal(outputs[i]);
      }
    });
  });
});
