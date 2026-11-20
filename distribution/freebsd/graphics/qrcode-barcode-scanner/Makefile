PORTNAME=	qrcode-barcode-scanner
DISTVERSION=	0.11.0
CATEGORIES=	graphics
MASTER_SITES=	https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v${DISTVERSION}/
DISTNAME=	qrcode-barcode-scanner-cli-${DISTVERSION}-source
DISTFILES=	${DISTNAME}${EXTRACT_SUFX}

MAINTAINER=	contact@qrcode-ai.com
COMMENT=	Offline QR code and barcode scanner for the command line
WWW=		https://qrcode-ai.com/en-US/qr-code-scanner/cli

LICENSE=	AGPLv3+
LICENSE_FILE=	${WRKSRC}/LICENSE

USES=		cargo

# The archive holds the whole workspace and its Cargo.lock; only the qrscan crate is built and
# tested. The workspace release profile stays as it is: it checks integer overflow in the rxing
# reader, and the engine catches reader panics, so panic=abort must never be added.
CARGO_BUILD_ARGS=	--package qrcode-barcode-scanner-cli
CARGO_TEST_ARGS=	--package qrcode-barcode-scanner-cli
CARGO_INSTALL_PATH=	crates/qrcode-ai-scanner-cli

PLIST_FILES=	bin/qrscan

# The mixed fixture holds a QR code and a Code 128: every profile must read both.
post-test:
.for profile in fast frame full
	${CARGO_TARGET_DIR}/release/qrscan --profile ${profile} --budget-ms 0 \
		${WRKSRC}/fixtures/symbology/mixed-code128-qr.png > ${WRKDIR}/scan-${profile}.json
	${GREP} -qF '"text": "https://qrc-ai.com/76xMa"' ${WRKDIR}/scan-${profile}.json
	${GREP} -qF '"text": "STOCK-4827"' ${WRKDIR}/scan-${profile}.json
.endfor

.include "Makefile.crates"
.include <bsd.port.mk>
