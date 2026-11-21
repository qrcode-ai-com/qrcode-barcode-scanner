<?php

/**
 * @package     QRCodeBarcodeScanner
 * @copyright   (C) 2026 SuperNovae Studio, QR Code AI
 * @license     GNU General Public License version 3 or later; see LICENSE.txt. This file is also
 *              available under the MIT License, see LICENSE-MIT.txt.
 */

namespace QRCodeAI\Module\QrcodeBarcodeScanner\Site\Dispatcher;

\defined('_JEXEC') or die;

use Joomla\CMS\Dispatcher\AbstractModuleDispatcher;
use Joomla\CMS\Language\Text;

/**
 * Prepares what the layout shows: the translated texts the script module reads, the bundled
 * engine's identity and the module's three settings.
 */
class Dispatcher extends AbstractModuleDispatcher
{
    /**
     * The payload kinds of a scan report and their language keys.
     */
    private const KINDS = [
        'url', 'wifi', 'email', 'sms', 'tel', 'geo', 'gs1', 'gs1_digital_link', 'me_card',
        'crypto', 'v_card', 'v_event', 'text',
    ];

    /**
     * The texts of the script module, by the name it uses.
     */
    private const TEXTS = [
        'idle', 'loading', 'scanning', 'found', 'empty', 'inconclusive', 'unsupported',
        'unreadable', 'csp', 'loadFailed', 'scanFailed', 'copy', 'copied', 'copyFailed',
        'openLink', 'linkNote', 'hidden', 'lossy',
    ];

    /**
     * Returns the layout data, with the scanner's texts, engine and settings.
     *
     * @return  array
     */
    protected function getLayoutData(): array
    {
        $data   = parent::getLayoutData();
        $params = $data['params'];

        $texts = [];
        foreach (self::TEXTS as $name) {
            $texts[$name] = Text::_('MOD_QRCODEBARCODESCANNER_JS_' . strtoupper($name));
        }
        $texts['kinds'] = [];
        foreach (self::KINDS as $kind) {
            $texts['kinds'][$kind] = Text::_('MOD_QRCODEBARCODESCANNER_KIND_' . strtoupper($kind));
        }

        $profile = (string) $params->get('profile', 'full');

        $data['scanner'] = [
            'id'         => 'qrcode-barcode-scanner-' . (int) $data['module']->id,
            'profile'    => \in_array($profile, ['full', 'fast', 'frame'], true) ? $profile : 'full',
            'showReport' => (int) $params->get('show_report', 0) === 1,
            'showCredit' => (int) $params->get('show_credit', 0) === 1,
            'texts'      => $texts,
            'engine'     => self::engine(),
        ];

        return $data;
    }

    /**
     * The bundled engine, from the build-info.json of the npm package copied into media/.
     *
     * @return  array{package: string, version: string, wasm_sha256: string}
     */
    private static function engine(): array
    {
        static $engine = null;

        if ($engine === null) {
            $file   = JPATH_ROOT . '/media/mod_qrcodebarcodescanner/vendor/qrcode-barcode-scanner-wasm/build-info.json';
            $info   = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
            $engine = [
                'package'     => (string) ($info['package'] ?? ''),
                'version'     => (string) ($info['version'] ?? ''),
                'wasm_sha256' => (string) ($info['wasm']['sha256'] ?? ''),
            ];
        }

        return $engine;
    }
}
