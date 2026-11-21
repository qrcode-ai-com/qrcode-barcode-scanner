<?php

/**
 * @package     QRCodeBarcodeScanner
 * @copyright   (C) 2026 SuperNovae Studio, QR Code AI
 * @license     GNU General Public License version 3 or later; see LICENSE.txt. This file is also
 *              available under the MIT License, see LICENSE-MIT.txt.
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;

/** @var \Joomla\CMS\Application\SiteApplication $app */
/** @var array $scanner */

$wa = $app->getDocument()->getWebAssetManager();
$wa->getRegistry()->addExtensionRegistryFile('mod_qrcodebarcodescanner');
$wa->useStyle('mod_qrcodebarcodescanner.scanner')->useScript('mod_qrcodebarcodescanner.view');

$e        = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
$id       = $scanner['id'];
$profiles = [
    'full'  => Text::_('MOD_QRCODEBARCODESCANNER_PROFILE_FULL'),
    'fast'  => Text::_('MOD_QRCODEBARCODESCANNER_PROFILE_FAST'),
    'frame' => Text::_('MOD_QRCODEBARCODESCANNER_PROFILE_FRAME'),
];
$links = [
    ['https://qrcode-ai.com/en-US/qr-code-scanner', 'MOD_QRCODEBARCODESCANNER_LINK_QR_SCANNER'],
    ['https://qrcode-ai.com/en-US/barcode-scanner', 'MOD_QRCODEBARCODESCANNER_LINK_BARCODE_SCANNER'],
    ['https://qrcode-ai.com/en-US/qr-code-scanner/integrations/joomla', 'MOD_QRCODEBARCODESCANNER_LINK_QR_GUIDE'],
    ['https://qrcode-ai.com/en-US/barcode-scanner/integrations/joomla', 'MOD_QRCODEBARCODESCANNER_LINK_BARCODE_GUIDE'],
    ['https://qrcode-ai.com/en-US/qr-code-generator', 'MOD_QRCODEBARCODESCANNER_LINK_QR_GENERATOR'],
    ['https://qrcode-ai.com/en-US/barcode-generator', 'MOD_QRCODEBARCODESCANNER_LINK_BARCODE_GENERATOR'],
];
$anchors = array_map(
    static fn (array $link): string => '<a href="' . $e($link[0]) . '" rel="noopener">' . $e(Text::_($link[1])) . '</a>',
    $links
);
?>
<div class="qrbs" data-qrbs-root
    data-qrbs-texts="<?php echo $e(json_encode($scanner['texts'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); ?>"
    data-qrbs-package="<?php echo $e($scanner['engine']['package']); ?>"
    data-qrbs-version="<?php echo $e($scanner['engine']['version']); ?>"
    data-qrbs-wasm-sha256="<?php echo $e($scanner['engine']['wasm_sha256']); ?>"
    data-qrbs-engine-version="">
    <div class="qrbs__drop" data-qrbs="drop">
        <p class="qrbs__lead"><?php echo $e(Text::_('MOD_QRCODEBARCODESCANNER_LEAD')); ?></p>
        <p class="qrbs__actions">
            <label class="qrbs__button">
                <input type="file" class="qrbs__input" data-qrbs="file" id="<?php echo $e($id . '-file'); ?>"
                    accept="image/png,image/jpeg,image/webp,image/gif">
                <span><?php echo $e(Text::_('MOD_QRCODEBARCODESCANNER_CHOOSE')); ?></span>
            </label>
            <label class="qrbs__button qrbs__button--quiet">
                <input type="file" class="qrbs__input" data-qrbs="camera" accept="image/*" capture="environment">
                <span><?php echo $e(Text::_('MOD_QRCODEBARCODESCANNER_CAMERA')); ?></span>
            </label>
        </p>
    </div>
    <p class="qrbs__controls">
        <label for="<?php echo $e($id . '-profile'); ?>"><?php echo $e(Text::_('MOD_QRCODEBARCODESCANNER_PROFILE')); ?></label>
        <select id="<?php echo $e($id . '-profile'); ?>" data-qrbs="profile">
            <?php foreach ($profiles as $value => $label) : ?>
                <option value="<?php echo $e($value); ?>"<?php echo $value === $scanner['profile'] ? ' selected' : ''; ?>><?php echo $e($label); ?></option>
            <?php endforeach; ?>
        </select>
    </p>
    <div class="qrbs__result" data-qrbs="result" data-state="idle" data-scan="0" aria-live="polite">
        <p class="qrbs__summary" data-qrbs="summary"><?php echo $e($scanner['texts']['idle']); ?></p>
        <ol class="qrbs__detections" data-qrbs="detections"></ol>
    </div>
    <details class="qrbs__report"<?php echo $scanner['showReport'] ? '' : ' hidden'; ?>>
        <summary><?php echo $e(Text::_('MOD_QRCODEBARCODESCANNER_REPORT')); ?></summary>
        <pre data-qrbs="report" data-scan="0" data-profile=""></pre>
    </details>
    <?php if ($scanner['showCredit']) : ?>
        <p class="qrbs__credit"><?php echo Text::sprintf('MOD_QRCODEBARCODESCANNER_CREDIT', ...$anchors); ?></p>
    <?php endif; ?>
</div>
