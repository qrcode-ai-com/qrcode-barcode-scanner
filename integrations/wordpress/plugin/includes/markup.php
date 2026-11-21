<?php
/**
 * The scanner's markup, shared by the block and the shortcode.
 *
 * @package QRCodeBarcodeScanner
 */

defined( 'ABSPATH' ) || exit;

/**
 * The bundled engine: package name, version and WebAssembly SHA-256, written by the build from
 * the npm package it copied into assets/vendor/.
 *
 * @return array{package: string, version: string, wasm_sha256: string}
 */
function qrcode_barcode_scanner_engine() {
	static $engine = null;
	if ( null === $engine ) {
		$engine = require __DIR__ . '/engine.php';
	}
	return $engine;
}

/**
 * Texts the script module shows, translated here because script modules cannot load
 * translations themselves yet.
 *
 * @return array<string, mixed>
 */
function qrcode_barcode_scanner_texts() {
	return array(
		'idle'         => __( 'Choose an image to read its codes.', 'qrcode-barcode-scanner' ),
		'loading'      => __( 'Loading the scanner…', 'qrcode-barcode-scanner' ),
		/* translators: 1: the file name, 2: the profile name (fast, frame or full). */
		'scanning'     => __( 'Reading %1$s with the %2$s profile…', 'qrcode-barcode-scanner' ),
		/* translators: %d: the number of codes found. */
		'found'        => __( 'Codes found: %d.', 'qrcode-barcode-scanner' ),
		'empty'        => __( 'No QR code or barcode was found in this image.', 'qrcode-barcode-scanner' ),
		'inconclusive' => __( 'The scan stopped before it finished. Try the full profile.', 'qrcode-barcode-scanner' ),
		'unsupported'  => __( 'This file type is not supported. Choose a PNG, JPEG, WebP or GIF image.', 'qrcode-barcode-scanner' ),
		'unreadable'   => __( 'This file could not be read as a PNG, JPEG, WebP or GIF image.', 'qrcode-barcode-scanner' ),
		'csp'          => __( 'This site does not allow WebAssembly, so the scanner cannot start. A site administrator can allow it with the wasm-unsafe-eval source of the Content Security Policy.', 'qrcode-barcode-scanner' ),
		/* translators: %s: a short error code or message. */
		'loadFailed'   => __( 'The scanner could not start in this browser (%s).', 'qrcode-barcode-scanner' ),
		/* translators: %s: the error message. */
		'scanFailed'   => __( 'The scan failed: %s', 'qrcode-barcode-scanner' ),
		'copy'         => __( 'Copy text', 'qrcode-barcode-scanner' ),
		'copied'       => __( 'Copied', 'qrcode-barcode-scanner' ),
		'copyFailed'   => __( 'Copy failed: select the text', 'qrcode-barcode-scanner' ),
		'openLink'     => __( 'Open link', 'qrcode-barcode-scanner' ),
		'linkNote'     => __( 'This link was not opened. Read the address before you open it.', 'qrcode-barcode-scanner' ),
		/* translators: %d: the number of invisible characters. */
		'hidden'       => __( 'This text holds %d invisible or direction-changing characters, shown by their code point. Copy keeps the exact text.', 'qrcode-barcode-scanner' ),
		'lossy'        => __( 'Some bytes are not text in a known character set and are shown as a replacement character.', 'qrcode-barcode-scanner' ),
		'kinds'        => array(
			'url'               => __( 'Link', 'qrcode-barcode-scanner' ),
			'wifi'              => __( 'Wi-Fi network', 'qrcode-barcode-scanner' ),
			'email'             => __( 'Email', 'qrcode-barcode-scanner' ),
			'sms'               => __( 'Text message', 'qrcode-barcode-scanner' ),
			'tel'               => __( 'Phone number', 'qrcode-barcode-scanner' ),
			'geo'               => __( 'Location', 'qrcode-barcode-scanner' ),
			'gs1'               => __( 'GS1 element string', 'qrcode-barcode-scanner' ),
			'gs1_digital_link'  => __( 'GS1 Digital Link', 'qrcode-barcode-scanner' ),
			'me_card'           => __( 'Contact (MECARD)', 'qrcode-barcode-scanner' ),
			'crypto'            => __( 'Payment address', 'qrcode-barcode-scanner' ),
			'v_card'            => __( 'Contact (vCard)', 'qrcode-barcode-scanner' ),
			'v_event'           => __( 'Calendar event', 'qrcode-barcode-scanner' ),
			'text'              => __( 'Text', 'qrcode-barcode-scanner' ),
		),
	);
}

/**
 * The credit line, shown only when the site owner turns it on.
 *
 * @return string
 */
function qrcode_barcode_scanner_credit() {
	$links = array(
		'qr_scanner'  => array( 'https://qrcode-ai.com/en-US/qr-code-scanner', __( 'QR code scanner', 'qrcode-barcode-scanner' ) ),
		'bar_scanner' => array( 'https://qrcode-ai.com/en-US/barcode-scanner', __( 'barcode scanner', 'qrcode-barcode-scanner' ) ),
		'qr_guide'    => array( 'https://qrcode-ai.com/en-US/qr-code-scanner/integrations/wordpress', __( 'QR code guide', 'qrcode-barcode-scanner' ) ),
		'bar_guide'   => array( 'https://qrcode-ai.com/en-US/barcode-scanner/integrations/wordpress', __( 'barcode guide', 'qrcode-barcode-scanner' ) ),
		'qr_maker'    => array( 'https://qrcode-ai.com/en-US/qr-code-generator', __( 'QR code generator', 'qrcode-barcode-scanner' ) ),
		'bar_maker'   => array( 'https://qrcode-ai.com/en-US/barcode-generator', __( 'barcode generator', 'qrcode-barcode-scanner' ) ),
	);
	$html = array();
	foreach ( $links as $key => $link ) {
		$html[ $key ] = sprintf( '<a href="%1$s" rel="noopener">%2$s</a>', esc_url( $link[0] ), esc_html( $link[1] ) );
	}
	return sprintf(
		/* translators: 1: QR code scanner link, 2: barcode scanner link, 3: QR code guide link, 4: barcode guide link, 5: QR code generator link, 6: barcode generator link. */
		esc_html__( 'Read by the open-source QR Code & Barcode Scanner engine of QR Code AI, also on the web as a %1$s and a %2$s. The %3$s and %4$s explain this plugin, and the %5$s and %6$s make test images.', 'qrcode-barcode-scanner' ),
		$html['qr_scanner'],
		$html['bar_scanner'],
		$html['qr_guide'],
		$html['bar_guide'],
		$html['qr_maker'],
		$html['bar_maker']
	);
}

/**
 * The scanner: an image chooser, a camera button, a profile list, the results and the report.
 *
 * Decoded text is set by the script module as text, never as markup. Every value printed here
 * is escaped.
 *
 * @param array  $attributes         Block attributes: profile, showReport, showCredit.
 * @param string $wrapper_attributes The wrapper's attributes, already escaped.
 * @return string
 */
function qrcode_barcode_scanner_markup( $attributes, $wrapper_attributes ) {
	$profiles = array(
		'full'  => __( 'full, the most thorough', 'qrcode-barcode-scanner' ),
		'fast'  => __( 'fast, for clear images', 'qrcode-barcode-scanner' ),
		'frame' => __( 'frame, the quickest', 'qrcode-barcode-scanner' ),
	);
	$profile = isset( $attributes['profile'] ) && isset( $profiles[ $attributes['profile'] ] )
		? $attributes['profile'] : 'full';
	$engine  = qrcode_barcode_scanner_engine();
	$id      = wp_unique_id( 'qrcode-barcode-scanner-' );
	$texts   = qrcode_barcode_scanner_texts();

	ob_start();
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by get_block_wrapper_attributes() or a literal. ?>>
		<div class="qrbs" data-qrbs-root
			data-qrbs-texts="<?php echo esc_attr( wp_json_encode( $texts ) ); ?>"
			data-qrbs-package="<?php echo esc_attr( $engine['package'] ); ?>"
			data-qrbs-version="<?php echo esc_attr( $engine['version'] ); ?>"
			data-qrbs-wasm-sha256="<?php echo esc_attr( $engine['wasm_sha256'] ); ?>"
			data-qrbs-engine-version="">
			<div class="qrbs__drop" data-qrbs="drop">
				<p class="qrbs__lead"><?php esc_html_e( 'Choose an image or take a photo of a QR code or a barcode. The image is read in your browser and is never uploaded.', 'qrcode-barcode-scanner' ); ?></p>
				<p class="qrbs__actions">
					<label class="qrbs__button">
						<input type="file" class="qrbs__input" data-qrbs="file" id="<?php echo esc_attr( $id . '-file' ); ?>"
							accept="image/png,image/jpeg,image/webp,image/gif">
						<span><?php esc_html_e( 'Choose an image', 'qrcode-barcode-scanner' ); ?></span>
					</label>
					<label class="qrbs__button qrbs__button--quiet">
						<input type="file" class="qrbs__input" data-qrbs="camera" accept="image/*" capture="environment">
						<span><?php esc_html_e( 'Take a photo', 'qrcode-barcode-scanner' ); ?></span>
					</label>
				</p>
			</div>
			<p class="qrbs__controls">
				<label for="<?php echo esc_attr( $id . '-profile' ); ?>"><?php esc_html_e( 'Profile', 'qrcode-barcode-scanner' ); ?></label>
				<select id="<?php echo esc_attr( $id . '-profile' ); ?>" data-qrbs="profile">
					<?php foreach ( $profiles as $value => $label ) : ?>
						<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $profile, $value ); ?>><?php echo esc_html( $label ); ?></option>
					<?php endforeach; ?>
				</select>
			</p>
			<div class="qrbs__result" data-qrbs="result" data-state="idle" data-scan="0" aria-live="polite">
				<p class="qrbs__summary" data-qrbs="summary"><?php echo esc_html( $texts['idle'] ); ?></p>
				<ol class="qrbs__detections" data-qrbs="detections"></ol>
			</div>
			<details class="qrbs__report" <?php echo empty( $attributes['showReport'] ) ? 'hidden' : ''; ?>>
				<summary><?php esc_html_e( 'Full report (JSON)', 'qrcode-barcode-scanner' ); ?></summary>
				<pre data-qrbs="report" data-scan="0" data-profile=""></pre>
			</details>
			<?php if ( ! empty( $attributes['showCredit'] ) ) : ?>
				<p class="qrbs__credit"><?php echo wp_kses( qrcode_barcode_scanner_credit(), array( 'a' => array( 'href' => array(), 'rel' => array() ) ) ); ?></p>
			<?php endif; ?>
		</div>
	</div>
	<?php
	return (string) ob_get_clean();
}
