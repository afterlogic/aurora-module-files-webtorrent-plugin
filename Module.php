<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\FilesWebtorrentPlugin;

/**
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2021, Afterlogic Corp.
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractWebclientModule
{
	private $aPublicFileData = null;

	public function init()
	{
		$this->subscribeEvent('AddToContentSecurityPolicyDefault', array($this, 'onAddToContentSecurityPolicyDefault'), 150);

		$this->AddEntry('webtorrent', 'EntryWebtorrent');
	}

	public function onAddToContentSecurityPolicyDefault($aArgs, &$aAddDefault)
	{
		$aAddDefault[] = '; connect-src *';
	}

	public function EntryWebtorrent()
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);

		$sHash = (string) \Aurora\System\Router::getItemByIndex(1, '');
		$aHash = \Aurora\System\Api::DecodeKeyValues($sHash);
		$this->aPublicFileData = $aHash;
		if (\is_array($aHash) && 0 < \count($aHash))
		{
			$oFileInfo = \Aurora\Modules\Files\Module::Decorator()->GetFileInfo($aHash['UserId'], $aHash['Type'], $aHash['Path'], $aHash['Id']);
			$this->aPublicFileData['Size'] = $oFileInfo->Size;
			$this->aPublicFileData['Actions'] = $oFileInfo->Actions;
		}
		
//		$sType = isset($aHash['Type']) ? $aHash['Type'] : '';
//		$sPath = isset($aHash['Path']) ? $aHash['Path'] : '';
//		$sName = isset($aHash['Name']) ? $aHash['Name'] : '';
//		$sFullPath = \ltrim($sPath, '/') . '/' . \ltrim($sName, '/');
//		$sResourceId = $sType . '/' . \ltrim($sFullPath, '/');
//		$aArgs = [
//			'UserId' => $aHash['UserId'],
//			'ResourceType' => 'file',
//			'ResourceId' => $sResourceId,
//			'Action' => $sAction
//		];
//		$this->broadcastEvent('AddToActivityHistory', $aArgs);

		$oApiIntegrator = \Aurora\System\Managers\Integrator::getInstance();
		$oCoreClientModule = \Aurora\System\Api::GetModule('CoreWebclient');
		$sResult = \file_get_contents($oCoreClientModule->GetPath().'/templates/Index.html');
		
		$aConfig = [
			'public_app' => true,
			'modules_list' => array_merge(
				['CoreWebclient'],
				$oApiIntegrator->GetModulesForEntry('FilesWebtorrentPlugin')
			)
		];

		$sResult = \strtr(
			$sResult,
			[
				'{{AppVersion}}' => AU_APP_VERSION,
				'{{IntegratorDir}}' => $oApiIntegrator->isRtl() ? 'rtl' : 'ltr',
				'{{IntegratorLinks}}' => $oApiIntegrator->buildHeadersLink(),
				'{{IntegratorBody}}' => $oApiIntegrator->buildBody($aConfig)
			]
		);

		\Aurora\Modules\CoreWebclient\Module::Decorator()->SetHtmlOutputHeaders();
		return $sResult;
		
	}

	public function GetSettings()
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::Anonymous);

		$aSettings = [];

		if ($this->aPublicFileData)
		{
			$aSettings['PublicFileData'] = $this->aPublicFileData;
		}

		return $aSettings;
	}
}
