<?php
/**
 * Plugin Name:       QR Code & Barcode Scanner
 * Plugin URI:        https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust
 * Description:       A block and a shortcode that read QR codes and barcodes from an image or a photo, in the visitor's browser. The image is never uploaded.
 * Version:           0.1.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            QR Code AI
 * Author URI:        https://qrcode-ai.com/
 * License:           AGPL-3.0-or-later
 * License URI:       https://www.gnu.org/licenses/agpl-3.0.html
 * Text Domain:       qrcode-barcode-scanner
 *
 * @package QRCodeBarcodeScanner
 */

defined( 'ABSPATH' ) || exit;

define( 'QRCODE_BARCODE_SCANNER_VERSION', '0.1.0' );
define( 'QRCODE_BARCODE_SCANNER_FILE', __FILE__ );

require_once __DIR__ . '/includes/markup.php';

add_action( 'init', 'qrcode_barcode_scanner_register' );

/**
 * Registers the scanner's script module, its stylesheet, the block and the shortcode.
 *
 * The script module and the WebAssembly engine are files of this plugin, so the scanner loads
 * from the site itself and never calls another server.
 */
function qrcode_barcode_scanner_register() {
	wp_register_script_module(
		'qrcode-barcode-scanner-view',
		plugins_url( 'assets/scanner/view.js', QRCODE_BARCODE_SCANNER_FILE ),
		array(),
		QRCODE_BARCODE_SCANNER_VERSION
	);
	wp_register_style(
		'qrcode-barcode-scanner',
		plugins_url( 'assets/scanner/scanner.css', QRCODE_BARCODE_SCANNER_FILE ),
		array(),
		QRCODE_BARCODE_SCANNER_VERSION
	);
	register_block_type( __DIR__ . '/build/scanner' );
	add_shortcode( 'qrcode_barcode_scanner', 'qrcode_barcode_scanner_shortcode' );
}

/**
 * The [qrcode_barcode_scanner] shortcode.
 *
 * Attributes: profile (full, fast or frame; default full), report (yes to show the JSON report)
 * and credit (yes to show a line about the open-source engine with links to QR Code AI; off by
 * default, as the plugin guidelines require).
 *
 * @param array|string $atts Shortcode attributes.
 * @return string The scanner's markup.
 */
function qrcode_barcode_scanner_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'profile' => 'full',
			'report'  => 'no',
			'credit'  => 'no',
		),
		$atts,
		'qrcode_barcode_scanner'
	);
	wp_enqueue_script_module( 'qrcode-barcode-scanner-view' );
	wp_enqueue_style( 'qrcode-barcode-scanner' );
	return qrcode_barcode_scanner_markup(
		array(
			'profile'    => (string) $atts['profile'],
			'showReport' => 'yes' === $atts['report'],
			'showCredit' => 'yes' === $atts['credit'],
		),
		'class="wp-block-qrcode-barcode-scanner-scanner"'
	);
}
