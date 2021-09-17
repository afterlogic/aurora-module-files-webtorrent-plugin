'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	WebTorrent = require('modules/%ModuleName%/js/vendors/webtorrent.min.js'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	UrlUtils = require('%PathToCoreWebclientModule%/js/utils/Url.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	AlertPopup = require('%PathToCoreWebclientModule%/js/popups/AlertPopup.js'),
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CJua = require('%PathToCoreWebclientModule%/js/CJua.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),

	CFileView = require('modules/%ModuleName%/js/views/CFileView.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),

	CAbstractScreenView = require('%PathToCoreWebclientModule%/js/views/CAbstractScreenView.js')
;

/**
* @constructor
*/
function CTorrentView()
{
	CAbstractScreenView.call(this, '%ModuleName%');

	this.browserTitle = ko.observable(TextUtils.i18n('%MODULENAME%/HEADING_BROWSER_TAB'));
	
	this.bMagnetLink = _.isEmpty(Settings.PublicFileData);
	this.storage = ko.observable('');
	this.path = ko.observable('');
	this.magnetLink = ko.observable('');
	this.torrentName = ko.observable('');
	
	this.downloadStarted = ko.observable(false);
	this.downloadFromMagnetCommand = Utils.createCommand(this, this.downloadFromMagnet, function () {
		return !this.downloadStarted();
	});
	
	this.uploadTorrentPercent = ko.observable(0);
	this.torrentUploaded = ko.computed(function () {
		return this.uploadTorrentPercent() === 100;
	}, this);
	this.isTorrentSaving = ko.observable(false);
	this.saveTorrentToFilesCommand = Utils.createCommand(this, this.saveTorrentToFiles, function () {
		return !this.isTorrentSaving() && !this.torrentUploaded();
	});
	
	this.files = ko.observableArray([]);
	this.pathToSaveText = ko.computed(function () {
		var sSubPath = this.files().length === 1 ? '' : ('/' + this.torrentName());
		return TextUtils.i18n('%MODULENAME%/INFO_PATH_TO_SAVE_PLURAL', {
			'STORAGE': this.storage(),
			'PATH': this.path() + sSubPath
		}, null, this.files().length);
	}, this);

	this.hasNoSource = ko.observable(false);

	this.downloadPercent = ko.observable(0);
	this.downloaded = ko.computed(function () {
		return this.downloadPercent() === 100;
	}, this);
	this.downloadText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_DOWNLOADED_PERCENT', {'PERCENT': this.downloadPercent()});
	}, this);

	this.peersCount = ko.observable(0);
	this.peersText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_SEEDING_TO_PEERS_PLURAL', {'COUNT': this.peersCount()}, null, this.peersCount());
	}, this);
	
	this.uploaded = ko.computed(function () {
		var aUploadedFiles = _.filter(this.files(), function (oFile) {
			return oFile.uploaded();
		});
		return this.files().length === aUploadedFiles.length;
	}, this);

	this.isSaving = ko.observable(false);
	this.saveToFilesButtonText = ko.computed(function () {
		if (this.uploaded())
		{
			return TextUtils.i18n('%MODULENAME%/ACTION_SAVED_TO_FILES');
		}
		if (this.isSaving())
		{
			return TextUtils.i18n('%MODULENAME%/ACTION_SAVE_TO_FILES_IN_PROGRESS');
		}
		if (this.files().length > 1)
		{
			return TextUtils.i18n('%MODULENAME%/ACTION_SAVE_ALL_TO_FILES');
		}
		return TextUtils.i18n('%MODULENAME%/ACTION_SAVE_TO_FILES');
	}, this);
	this.saveAllToFilesCommand = Utils.createCommand(this, this.saveAllToFiles, function () {
		return this.downloaded() && !this.isSaving() && !this.uploaded();
	});
	
	this.peersCount = ko.observable(0);
	this.peersText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_SEEDING_TO_PEERS_PLURAL', {'COUNT': this.peersCount()}, null, this.peersCount());
	}, this);
	
	this.visiblePreview = ko.observable(false);
}

_.extendOwn(CTorrentView.prototype, CAbstractScreenView.prototype);

CTorrentView.prototype.ViewTemplate = '%ModuleName%_TorrentView';
CTorrentView.prototype.ViewConstructorName = 'CTorrentView';

CTorrentView.prototype.onRoute = function (aParams)
{
	var
		sStorage = '',
		sPath = ''
	;
	if (this.bMagnetLink && _.isArray(aParams))
	{
		var iIndex = 0;
		if (aParams[iIndex] === 'storage' && aParams[iIndex + 1])
		{
			sStorage = aParams[iIndex + 1];
			iIndex += 2;
		}
		if (aParams[iIndex] === 'path' && aParams[iIndex + 1])
		{
			sPath = aParams[iIndex + 1];
			iIndex += 2;
		}
	}
	else
	{
		sStorage = Types.pString(Settings.PublicFileData.Type);
		sPath = Types.pString(Settings.PublicFileData.Path);
	}

	var bCanSaveToStorage = sStorage === Enums.FileStorageType.Personal || sStorage === Enums.FileStorageType.Corporate;
	if (!bCanSaveToStorage)
	{
		sStorage = Enums.FileStorageType.Personal;
		sPath = '';
	}

	this.storage(sStorage);
	this.path(sPath);
};

CTorrentView.prototype.isValidMagnetLink = function ()
{
	if (_.isEmpty(this.magnetLink()))
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_MAGNET_LINK_EMPTY'), true);
		return false;
	}
	return true;
};

CTorrentView.prototype.downloadFromMagnet = function ()
{
	if (this.isValidMagnetLink())
	{
		this.download(this.magnetLink());
	}
};

CTorrentView.prototype.onShow = function ()
{
	var $html = $('html');
	$html.addClass('non-adjustable');
	if (!this.bMagnetLink)
	{
		var
			oActions = Settings.PublicFileData.Actions,
			sDownloadUrl = Types.pString(oActions && oActions.download && oActions.download.url)
		;
		if (_.isEmpty(sDownloadUrl))
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_TORRENT_DOWNLOAD_URL_EMPTY'), true);
		}
		else
		{
			this.download(UrlUtils.getAppPath() + sDownloadUrl);
		}
	}
};

CTorrentView.prototype.getWebTorrentClient = function ()
{
	var oClient = new WebTorrent();

	oClient.on('error', function (err) {
	  Screens.showError(TextUtils.i18n('COREWEBCLIENT/ERROR_UNKNOWN') + ' (' + err.message + ')', true);
	});
	
	return oClient;
};

CTorrentView.prototype.download = function (sUrl)
{
	var oClient = this.getWebTorrentClient();

	oClient.add(sUrl, function (oTorrent) {
		this.downloadStarted(true);

		this.files(_.map(oTorrent.files, function (oFile) {
			return new CFileView(oFile, this);
		}.bind(this)));
		
		this.populateTorrent(oTorrent);

		setInterval(this.onProgress.bind(this, oTorrent), 500);
	}.bind(this));
};

CTorrentView.prototype.populateTorrent = function (oTorrent)
{
	this.aTorrentFile = oTorrent.torrentFile;
	this.torrentName(oTorrent.name.replace('.', '_'));
};

CTorrentView.prototype.onProgress = function (oTorrent)
{
	this.hasNoSource(oTorrent.wires.length === 0);
	this.downloadPercent(Math.floor(oTorrent.progress * 100));
	this.peersCount(oTorrent.numPeers);
	_.each(this.files(), function (oFile) {
		oFile.downloadPercent(Math.floor(oFile.oTorrentFile.progress * 100));
	});
};

CTorrentView.prototype.saveTorrentToFiles = function () {
	function saveTorrentToFiles() {
		var oFile = new File([this.aTorrentFile], this.torrentName() + '.torrent');
		if (this.isValidFileSize(oFile))
		{
			this.isTorrentSaving(true);
			this.uploadFile(oFile, '', this.onTorrentUploadProgress.bind(this),
							this.onTorrentUploadComplete.bind(this));
		}
	}

	if (this.aTorrentFile)
	{
		saveTorrentToFiles.call(this);
	}
	else if (this.isValidMagnetLink())
	{
		var oClient = this.getWebTorrentClient();

		oClient.add(this.magnetLink(), function (oTorrent) {
			this.populateTorrent(oTorrent);
			saveTorrentToFiles.call(this);
		}.bind(this));
	}
};

CTorrentView.prototype.saveAllToFiles = function () {
	var
		iIndex = -1,
		fStartNextUpload = function () {
			iIndex++;
			if (iIndex < this.files().length)
			{
				this.uploadFileItem(iIndex, fStartNextUpload);
			}
			else
			{
				this.isSaving(false);
				if (this.uploaded())
				{
					if (this.files().length === 1)
					{
						Screens.showReport(TextUtils.i18n('%MODULENAME%/REPORT_FILE_UPLOAD'));
					}
					else
					{
						Screens.showReport(TextUtils.i18n('%MODULENAME%/REPORT_FILES_UPLOAD'));
					}
				}
			}
		}.bind(this)
	;
	this.isSaving(true);
	fStartNextUpload();
};

CTorrentView.prototype.uploadFileItem = function (iIndex, fCallback) {
	var oFile = this.files()[iIndex];
	if (oFile && oFile.allowUpload())
	{
		var oSubscription = oFile.isSaving.subscribe(function () {
			if (!oFile.isSaving())
			{
				oSubscription.dispose();
				fCallback();
			}
		}, this);
		oFile.saveToFiles(true);
	}
	else
	{
		fCallback();
	}
};

CTorrentView.prototype.isValidFileSize = function (oFile) {
	var
		sFileName = oFile.name,
		sFileSize = oFile.size
	;

	if (Settings.EnableUploadSizeLimit && sFileSize/(1024*1024) > Settings.UploadSizeLimitMb)
	{
		Popups.showPopup(AlertPopup, [
			TextUtils.i18n('FILESWEBCLIENT/ERROR_SIZE_LIMIT', { 'FILENAME': sFileName, 'SIZE': Math.floor(sFileSize / (1024 * 1024)) })
		]);
		return false;
	}

	return true;
};

CTorrentView.prototype.uploadFile = function (oFile, sSubPath, onFileUploadProgress, onFileUploadComplete) {
	var
		sFileName = oFile.name,
		sFileSize = oFile.size
	;

	var oJua = new CJua({
		'action': '?/Api/',
		'name': 'jua-uploader',
		'queueSize': 2,
		'disableAjaxUpload': false,
		'disableFolderDragAndDrop': true,
		'disableDragAndDrop': true,
		'hidden': _.extendOwn({
			'Module': 'Files',
			'Method': 'UploadFile',
			'Parameters':  function (oFile) {
				return JSON.stringify({
					'Type': this.storage(),
					'SubPath': sSubPath,
					'Path': this.path(),
					'Overwrite': false
				});
			}.bind(this)
		}, App.getCommonRequestParameters())
	});

	oJua
		.on('onProgress', onFileUploadProgress)
		.on('onComplete', onFileUploadComplete)
	;

	oJua.addNewFile({
		File: oFile,
		FileName: sFileName,
		Folder: '',
		Size: sFileSize,
		Type: oFile.type
	});
};

CTorrentView.prototype.isUploadError = function (bResponseReceived, oResult)
{
	var bError = !bResponseReceived || !oResult || !!oResult.ErrorCode || !oResult.Result || !!oResult.Result.Error || false;

	if (bError)
	{
		var
			sError = TextUtils.i18n('COREWEBCLIENT/ERROR_UPLOAD_UNKNOWN'),
			iErrorCode = oResult && oResult.ErrorCode
		;
		if (iErrorCode === Enums.Errors.CanNotUploadFileLimit)
		{
			sError = TextUtils.i18n('COREWEBCLIENT/ERROR_UPLOAD_SIZE');
		}
		else if (iErrorCode === Enums.Errors.CanNotUploadFileQuota)
		{
			sError = TextUtils.i18n('COREWEBCLIENT/ERROR_CANT_UPLOAD_FILE_QUOTA');
		}
		Screens.showError(sError, true);
		console.log('bResponseReceived', bResponseReceived, 'oResult', oResult);
	}

	return bError;
};

CTorrentView.prototype.onTorrentUploadProgress = function (sFileUid, iUploadedSize, iTotalSize)
{
	this.uploadTorrentPercent(Math.floor((iUploadedSize / iTotalSize) * 100));
};

CTorrentView.prototype.onTorrentUploadComplete = function (sFileUid, bResponseReceived, oResult)
{
	this.isTorrentSaving(false);
	if (this.isUploadError(bResponseReceived, oResult))
	{
		this.uploadTorrentPercent(0);
	}
	else
	{
		Screens.showReport(TextUtils.i18n('%MODULENAME%/REPORT_TORRENT_UPLOAD'));
	}
};

module.exports = CTorrentView;
