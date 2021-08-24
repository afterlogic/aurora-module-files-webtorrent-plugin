'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	moment = require('moment'),
	videojs = require('video.js').default,
	WebTorrent = require('modules/%ModuleName%/js/vendors/webtorrent.min.js'),

	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	UrlUtils = require('%PathToCoreWebclientModule%/js/utils/Url.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),

	CAbstractScreenView = require('%PathToCoreWebclientModule%/js/views/CAbstractScreenView.js')
;

require('modules/OpenPgpFilesWebclient/styles/vendors/video-js.css');

/**
* @constructor
*/
function CFileView()
{
	this.href = ko.observable('');
	CAbstractScreenView.call(this, '%ModuleName%');

	this.aSupportedVideoExt = ['mp4', 'url'];
	this.aSupportedAudioExt = ['mp3'];

	this.isDownloadingAndDecrypting = ko.observable(false);
	this.browserTitle = ko.observable(TextUtils.i18n('%MODULENAME%/HEADING_BROWSER_TAB'));
	this.hash = Settings.PublicFileData.Hash ? Settings.PublicFileData.Hash : '';
	this.fileName = Settings.PublicFileData.Name ? Settings.PublicFileData.Name : '';
	this.fileSize = Settings.PublicFileData.Size ? TextUtils.getFriendlySize(Settings.PublicFileData.Size) : '';
	this.fileUrl = Settings.PublicFileData.Url ? Settings.PublicFileData.Url : '';
	this.fileDownload = Settings.PublicFileData.Url ? Settings.PublicFileData.Url : '';
	this.bSecuredLink = !!Settings.PublicFileData.IsSecuredLink;
	this.isUrlFile = Settings.PublicFileData.IsUrlFile ? Settings.PublicFileData.IsUrlFile : false;
	this.sParanoidKeyPublic = Settings.PublicFileData.ParanoidKeyPublic? Settings.PublicFileData.ParanoidKeyPublic : '';
	this.sInitializationVector = Settings.PublicFileData.InitializationVector? Settings.PublicFileData.InitializationVector : '';
	this.bShowPlayButton = ko.observable(false);
	this.bShowVideoPlayer = ko.observable(false);
	this.bShowAudioPlayer = ko.observable(false);
	this.isMedia = ko.observable(false);
}

_.extendOwn(CFileView.prototype, CAbstractScreenView.prototype);

CFileView.prototype.ViewTemplate = '%ModuleName%_FileView';
CFileView.prototype.ViewConstructorName = 'CFileView';

CFileView.prototype.onShow = function ()
{
	var sUrl = UrlUtils.getAppPath() + Settings.PublicFileData.Actions.download.url;
	var client = new WebTorrent();
	client.add(sUrl, function (torrent) {
		// Torrents can contain many files. Let's use the .mp4 file
		var file = torrent.files.find(function (file) {
			return file.name.endsWith('.mp4');
		});
		// Display the file by adding it to the DOM.
		// Supports video, audio, image files, and more!
		file.appendTo('#file-from-torrent');
		$('#file-from-torrent video').addClass('vjs-tech');
	});
};

CFileView.prototype.securedLinkDownload = function ()
{
};

CFileView.prototype.play = function ()
{
};

CFileView.prototype.isFileVideo = function (sFileName)
{
	var sExt = Utils.getFileExtension(sFileName)	;

	return (-1 !== _.indexOf(this.aSupportedVideoExt, sExt.toLowerCase()));
};

CFileView.prototype.isFileAudio = function (sFileName)
{
	var sExt = Utils.getFileExtension(sFileName);

	return (-1 !== _.indexOf(this.aSupportedAudioExt, sExt.toLowerCase()));
};

CFileView.prototype.showVideoStreamPlayer = function (sSrc)
{
	var sType = 'application/x-mpegURL';
	this.oPlayer = videojs('video-player');
	this.oPlayer.src({type: sType, src: sSrc});
	this.bShowVideoPlayer(true);
};

CFileView.prototype.showVideoPlayer = function (sSrc)
{
	var sType = 'video/' + Utils.getFileExtension(this.fileName).toLowerCase();
	this.oPlayer = videojs('video-player');
	if (ModulesManager.isModuleAvailable('ActivityHistory'))
	{
		// play event is fired to many times
		this.oPlayer.on('loadeddata', function () {
			Ajax.send('ActivityHistory', 'CreateFromHash', {
				'Hash': this.hash,
				'EventName': 'play'
			});
		});
		this.oPlayer.on('ended', function () {
			Ajax.send('ActivityHistory', 'CreateFromHash', {
				'Hash': this.hash,
				'EventName': 'play-finish'
			});
		});
	}
	this.oPlayer.src({type: sType, src: sSrc});
	this.bShowVideoPlayer(true);
};

CFileView.prototype.showAudioPlayer = function (sSrc)
{
	var sType = 'audio/' + Utils.getFileExtension(this.fileName).toLowerCase();
	this.oPlayer = videojs('audio-player');
	if (ModulesManager.isModuleAvailable('ActivityHistory'))
	{
		// play event is fired to many times
		this.oPlayer.on('loadeddata', function () {
			Ajax.send('ActivityHistory', 'CreateFromHash', {
				'Hash': this.hash,
				'EventName': 'play'
			});
		});
		this.oPlayer.on('ended', function () {
			Ajax.send('ActivityHistory', 'CreateFromHash', {
				'Hash': this.hash,
				'EventName': 'play-finish'
			});
		});
	}
	this.oPlayer.src({type: sType, src: sSrc});
	this.bShowAudioPlayer(true);
};

module.exports = CFileView;
