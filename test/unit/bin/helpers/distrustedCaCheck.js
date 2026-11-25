'use strict';
const chai = require("chai"),
  expect = chai.expect,
  tls = require('tls');

const { installDistrustedCaCheck } = require("../../../../bin/helpers/distrustedCaCheck");

// EM DV TLS CA - G3B as issued by emSign Root TLS CA - G3, from https://emudhra.we-have-a-problem.com/impacted-intermediates.json
const DISTRUSTED_INTERMEDIATE_PEM = `-----BEGIN CERTIFICATE-----
MIIDaDCCAu6gAwIBAgIQAKSu5njyM2K0wORgt3LyFDAKBggqhkjOPQQDAzBWMQsw
CQYDVQQGEwJJTjElMCMGA1UECgwcZU11ZGhyYSBUZWNobm9sb2dpZXMgTGltaXRl
ZDEgMB4GA1UEAwwXZW1TaWduIFJvb3QgVExTIENBIC0gRzMwHhcNMjUwNDMwMTU1
NDA4WhcNNDAwNDI4MTgzMDAwWjA/MQswCQYDVQQGEwJOTDETMBEGA1UECgwKZU11
ZGhyYSBCVjEbMBkGA1UEAwwSRU0gRFYgVExTIENBIC0gRzNCMHYwEAYHKoZIzj0C
AQYFK4EEACIDYgAE557ZwEqXc8RzXlERHahawr1eZKs3S4DhLLwgOOweTw47gS/J
hZ4eZ6+wTi+LyX90hbplqpEe6KTkW2LVzAPVa+Z4s8OMtNyTfKJGDiOEU8iSk10p
1E+R4VYGtjzO2rRoo4IBljCCAZIwHwYDVR0jBBgwFoAU4TqrIXzx401UrtRyt/2L
WUIgkFQwHQYDVR0OBBYEFOIeL+ccGTkOVUtiwSAkVzUkiiUUMB0GA1UdJQQWMBQG
CCsGAQUFBwMBBggrBgEFBQcDAjBdBgNVHSAEVjBUMDkGCysGAQQBg44hAQABMCow
KAYIKwYBBQUHAgEWHGh0dHA6Ly9yZXBvc2l0b3J5LmVtc2lnbi5jb20wDQYLKwYB
BAGDjiEBAmQwCAYGZ4EMAQIBMHUGCCsGAQUFBwEBBGkwZzAkBggrBgEFBQcwAYYY
aHR0cDovL29jc3AtYi5lbXNpZ24uY29tMD8GCCsGAQUFBzAChjNodHRwOi8vcmVw
b3NpdG9yeS5lbXNpZ24uY29tL2NlcnRzL0VNRFZUTFNDQUczQi5wN2MwNwYDVR0f
BDAwLjAsoCqgKIYmaHR0cDovL2NybC5lbXNpZ24uY29tLz9yb290dGxzY2FnMy5j
cmwwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQAwCgYIKoZIzj0E
AwMDaAAwZQIwLmsGXi6oFMJ2klkcEMXMug6gvxQWZWkewiDWVzQyl2L6z6DuQfPO
Ibh1grvdULDCAjEAxZvLlxUavG69J6wnSjC8XBbqNIQsJ6CE2QdNOe84Ptxb6VG8
gt2TlfJbHii+KNvK
-----END CERTIFICATE-----`;

const NOT_A_CERTIFICATE = Buffer.from('not a certificate');

function peerChain(intermediate, leafIssuer = intermediate.subject) {
  const root = { subject: { CN: 'Test Root', O: 'Test', C: 'US' }, issuer: { CN: 'Test Root', O: 'Test', C: 'US' }, raw: NOT_A_CERTIFICATE };
  root.issuerCertificate = root;
  intermediate.issuer = root.subject;
  intermediate.issuerCertificate = root;
  return {
    subject: { CN: 'example.com' },
    subjectaltname: 'DNS:example.com',
    issuer: leafIssuer,
    raw: NOT_A_CERTIFICATE,
    issuerCertificate: intermediate,
  };
}

describe("distrustedCaCheck", () => {
  before(() => {
    installDistrustedCaCheck();
  });

  it("refuses a chain carrying a distrusted intermediate's name", () => {
    const cert = peerChain({ subject: { CN: 'EM DV TLS CA - G3B', O: 'eMudhra BV', C: 'NL' }, raw: NOT_A_CERTIFICATE });

    const error = tls.checkServerIdentity('example.com', cert);

    expect(error).to.be.an('error');
    expect(error.code).to.equal('ERR_TLS_DISTRUSTED_INTERMEDIATE');
  });

  it("compares names case-insensitively with whitespace collapsed", () => {
    const cert = peerChain(
      { subject: { CN: 'Test Intermediate', O: 'Test', C: 'US' }, raw: NOT_A_CERTIFICATE },
      { CN: ' em dv tls ca -  g3b', O: 'EMUDHRA BV', C: 'nl' }
    );

    expect(tls.checkServerIdentity('example.com', cert).code).to.equal('ERR_TLS_DISTRUSTED_INTERMEDIATE');
  });

  it("refuses a chain carrying a distrusted key under another name", () => {
    const raw = Buffer.from(DISTRUSTED_INTERMEDIATE_PEM.replace(/-----[^-]+-----|\s/g, ''), 'base64');
    const cert = peerChain({ subject: { CN: 'Test Intermediate', O: 'Test', C: 'US' }, raw });

    expect(tls.checkServerIdentity('example.com', cert).code).to.equal('ERR_TLS_DISTRUSTED_INTERMEDIATE');
  });

  it("allows a chain without a distrusted intermediate", () => {
    const cert = peerChain({ subject: { CN: 'Test Intermediate', O: 'Test', C: 'US' }, raw: NOT_A_CERTIFICATE });

    expect(tls.checkServerIdentity('example.com', cert)).to.be.undefined;
  });

  it("returns the hostname error before checking the chain", () => {
    const cert = peerChain({ subject: { CN: 'EM DV TLS CA - G3B', O: 'eMudhra BV', C: 'NL' }, raw: NOT_A_CERTIFICATE });

    expect(tls.checkServerIdentity('other.com', cert).code).to.equal('ERR_TLS_CERT_ALTNAME_INVALID');
  });

  it("does not wrap tls.checkServerIdentity a second time", () => {
    const wrapped = tls.checkServerIdentity;

    expect(installDistrustedCaCheck()).to.equal(false);
    expect(tls.checkServerIdentity).to.equal(wrapped);
  });
});
