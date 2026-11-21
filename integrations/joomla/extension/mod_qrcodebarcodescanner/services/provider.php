<?php

/**
 * @package     QRCodeBarcodeScanner
 * @copyright   (C) 2026 SuperNovae Studio, QR Code AI
 * @license     GNU General Public License version 3 or later; see LICENSE.txt. This file is also
 *              available under the MIT License, see LICENSE-MIT.txt.
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Extension\Service\Provider\Module;
use Joomla\CMS\Extension\Service\Provider\ModuleDispatcherFactory;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;

return new class () implements ServiceProviderInterface {
    /**
     * Registers the module's dispatcher with the container.
     *
     * @param   Container  $container  The DI container.
     *
     * @return  void
     */
    public function register(Container $container): void
    {
        $container->registerServiceProvider(new ModuleDispatcherFactory('\\QRCodeAI\\Module\\QrcodeBarcodeScanner'));
        $container->registerServiceProvider(new Module());
    }
};
