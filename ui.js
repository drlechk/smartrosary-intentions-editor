/* global NVS */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
		  const statusEl = el('status');
		  const globalProg = el('globalProg');
		  const globalProgBar = globalProg ? globalProg.querySelector('.bar') : null;
		  const fileInput = el('fileInput');
		  const themeToggle = el('themeToggle');
		  const titleTxt = el('titleTxt');
		  const dataSourceTitle = el('dataSourceTitle');
		  const entriesTitle = el('entriesTitle');
		  const editorTitle = el('editorTitle');
		  const entriesCountEl = el('entriesCount');
		  const entriesCountLabelEl = el('entriesCountLabel');
		  const usagePercentEl = el('usagePercent');
		  const utilLabelEl = el('utilLabel');
		  const btnBleConnect = el('btnBleConnect');
		  const btnBleRefresh = el('btnBleRefresh');
		  const btnBleDisconnect = el('btnBleDisconnect');
		  const btnBleUpload = el('btnBleUpload');
		  const btnBleDownload = el('btnBleDownload');
		  const btnRestoreFile = el('btnRestoreFile');
			  const numIntentionsEl = el('numIntentions');
			  const iSEl = el('iS');
			  const monthsListEl = el('monthsList');
		  const titleEl = el('title');
		  const descEl = el('desc');
		  const currentMonthEl = el('currentMonth');
		  const totalEntriesEl = el('totalEntries');
		  const btnPrev = el('btnPrev');
		  const btnNext = el('btnNext');
		  const btnAddEntry = el('btnAddEntry');
		  const btnDownload = el('btnDownload');
		  const btnSaveJson = el('btnSaveJson');
	  const btnSyncFromTitles = el('btnSyncFromTitles');
	  const usageFill = el('usageFill');
	  const usageStats = el('usageStats');
	  const previewCanvas = el('devicePreview');
	  const previewFrame = el('devicePreviewFrame');
	  const deviceOverlay = el('deviceOverlay');
	  const deviceOverlayITitle = el('deviceOverlayITitle');
	  const deviceOverlayDescCont = el('deviceOverlayDescCont');
	  const deviceOverlayDesc = el('deviceOverlayDesc');
	  const previewHint = el('previewHint');
	  const allowOverflowEl = el('allowOverflow');
	  const previewScrollWrap = el('previewScrollWrap');
	  const previewScroll = el('previewScroll');
	  const previewScrollLabel = el('previewScrollLabel');
	  const btnSuggestBreaks = el('btnSuggestBreaks');
		  const btnClearBreaks = el('btnClearBreaks');
		  const languageEl = el('language');
		  const hyphenAggression = el('hyphenAggression');
		  const hyphenAggressionLabel = el('hyphenAggressionLabel');
		  const intentionsTitleEl = el('intentionsTitle');
		  const intentionsIntroEl = el('intentionsIntro');
		  const intentionsEraseBtn = el('intentionsEraseBtn');
		  const intentionsSaveBtn = el('intentionsSaveBtn');
		  const intentionsAutoEl = el('intentionsAuto');
			  const intentionsAutoLabelEl = el('intentionsAutoLabel');
			  const intentionsHintEl = el('intentionsHint');
			  const intentionsEmptyEl = el('intentionsEmpty');
		  const intentionsTableEl = el('intentionsTable');
			  const intentionsTbody = intentionsTableEl ? intentionsTableEl.querySelector('tbody') : null;
		  const pillDeviceEl = el('pillDevice');
		  const pillFWEl = el('pillFW');
		  const intentionsCardEl = el('intentionsCard');
		  const overviewCardEl = el('overviewCard');
		  const entriesCardEl = el('entriesCard');
		  const editorCardEl = el('editorCard');

	  let model = {
	    numIntentions: 0,
	    iS: '',
	    titles: [],
	    descs: [],
	    descsSource: [],
	    schedAuto: false,
	    schedStarts: [],
	    schedSets: [],
	    schedParts: [],
	  };
	  let currentIndex = 0;
		  let previewTimer = null;
		  let devicePreviewTimer = null;
			  let editorLang = 'pl';
			  let hyphenAggressionValue = 45;
			  let suppressDescSourceUpdate = false;
			  let allowOverflow = true;
			  let lastOverlayKey = '';
			  let schedulerDirty = false;
			  let globalProgressActive = false;

  const SCHED_MAX_SLOTS = 32; // firmware Settings::MAX_INTENTION_SLOTS

	  // BLE state (must be defined before any initial UI render that checks connection state)
	  let bleDevice = null;
  let bleIntentsChar = null;
  let bleInfoCtrlChar = null;
  let bleInfoIntentionsChar = null;
  let bleInfoIntentEntryChar = null;
  let bleStatusChar = null;
	  let bleReady = true;
	  let overviewDeviceName = null;
	  let overviewFirmware = null;

  // Device preview layout (from esp32c3-rosary/src/lv_intentions.cpp)
  const DEVICE_W = 240;
  const DEVICE_H = 240;
  const CIRCLE_CX = 120;
  const CIRCLE_CY = 120;
  const CIRCLE_R = 120;
  const LV_TITLE_Y = 20; // top-mid label
  const LV_ITITLE_Y = 48; // intention title
  const LV_DESC_CENTER_Y = 120 + 24; // LV_ALIGN_CENTER y + 24
  const DESC_SAFE_TOP_Y = 82;
  const DESC_SAFE_BOTTOM_Y = 224;
  const DESC_LINE_HEIGHT = 17; // tighter leading to fit 8 lines without shifting the block
  const FONT_STACK = 'Montserrat, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const FONT_TITLE = `600 20px ${FONT_STACK}`;
  const FONT_ITITLE = `500 16px ${FONT_STACK}`;
  const FONT_DESC = `400 16px ${FONT_STACK}`;

  let fontsLoaded = false;
  let fontsLoadPromise = null;

  function ensureFontsLoaded() {
    if (fontsLoaded) return Promise.resolve();
    const fonts = document.fonts;
    if (!fonts || typeof fonts.load !== 'function') {
      fontsLoaded = true;
      return Promise.resolve();
    }
    if (!fontsLoadPromise) {
      fontsLoadPromise = Promise.all([
        fonts.load('400 16px Montserrat'),
        fonts.load('500 16px Montserrat'),
        fonts.load('600 20px Montserrat'),
      ])
        .catch(() => {})
        .then(() => { fontsLoaded = true; });
    }
    return fontsLoadPromise;
  }

		  let lastStatus = null; // { kind: 'key', key, vars, cls } | { kind: 'raw', msg, cls }

		  function applyStatusText(msg, cls) {
		    if (!statusEl) return;
		    statusEl.textContent = msg;
		    statusEl.className = 'toolbar-status' + (cls ? ' ' + cls : '');
		  }

		  function setStatus(msg, cls) {
		    lastStatus = { kind: 'raw', msg: String(msg ?? ''), cls: cls || '' };
		    applyStatusText(lastStatus.msg, lastStatus.cls);
		  }

		  function setStatusKey(key, cls, vars) {
		    lastStatus = { kind: 'key', key: String(key), vars: vars || null, cls: cls || '' };
		    applyStatusText(tr(lastStatus.key, lastStatus.vars), lastStatus.cls);
		  }

		  function refreshStatusForLang() {
		    if (!lastStatus) return;
		    if (lastStatus.kind === 'key') applyStatusText(tr(lastStatus.key, lastStatus.vars), lastStatus.cls);
		    else applyStatusText(lastStatus.msg, lastStatus.cls);
		  }

		  function setStatusFromError(err, fallbackKey) {
		    const msg = String(err?.message ?? err ?? '').trim();
		    if (msg === '__ERR_DEVICE_CONSENT__') {
		      setStatusKey('errDeviceConsent', 'danger');
		      return;
		    }
		    if (msg === '__ERR_CONNECT_FIRST__') {
		      setStatusKey('errConnectFirst', 'danger');
		      return;
		    }
		    if (msg === '__ERR_NOT_CONNECTED__' || msg === 'Not connected.') {
		      setStatusKey('notConnected', 'danger');
		      return;
		    }
		    const sizeMatch = msg.match(/Generated partition has size\\s+(\\d+)/i);
		    if (sizeMatch) {
		      setStatusKey('errGeneratedPartitionSize', 'danger', { len: sizeMatch[1] });
		      return;
		    }
		    if (!msg) {
		      setStatusKey(fallbackKey, 'danger');
		      return;
		    }
		    setStatus(msg, 'danger');
		  }

		  function setGlobalProgress(percent) {
		    if (!globalProg || !globalProgBar) return;
		    if (percent == null) {
		      globalProgressActive = false;
		      globalProg.hidden = true;
		      globalProgBar.style.width = '0%';
		      updateBleButtonsEnabled();
		      return;
		    }
		    const p = clamp(Number(percent) || 0, 0, 100);
		    globalProgressActive = true;
		    globalProg.hidden = false;
		    globalProgBar.style.width = `${p}%`;
		    updateBleButtonsEnabled();
		  }

	  function clamp(n, min, max) {
	    return Math.max(min, Math.min(max, n));
	  }

	  function normalizeLang(lang) {
	    return String(lang || '').trim().toLowerCase();
	  }

		  function getEditorLang() {
		    const v = normalizeLang(languageEl?.value || editorLang || 'pl');
		    if (v.startsWith('pl')) return 'pl';
		    if (v.startsWith('en')) return 'en';
		    if (v.startsWith('de')) return 'de';
		    return 'pl';
		  }

			  const UI_STRINGS = {
			    pl: {
			      title: 'SmartRosary — Intencje',
			      themeLight: 'Jasny',
			      themeDark: 'Ciemny',
			      themeSwitchToLightTitle: 'Przełącz na jasny motyw',
			      themeSwitchToDarkTitle: 'Przełącz na ciemny motyw',
			      pillDevice: 'Urządzenie: {v}',
			      pillFW: 'FW: {v}',
			      dataSource: 'Podsumowanie',
			      entries: 'Wpisy',
			      entriesCountLabel: 'Wpisy',
			      utilLabel: 'Wykorzystanie',
		      editor: 'Edytor',
		      backupRestore: 'Kopia i przywracanie',
		      restore: 'Wczytaj z pliku…',
		      bleReqHint: '',
		      previewSettings: 'Ustawienia podglądu',
		      dataSourceStatusHint: 'Status jest widoczny na górnym pasku.',
		      dataSourceHint: '',
		      bleHint: '',
		      previewSettingsLangHint: '',
		      wordBreaking: 'Dzielenie wyrazów',
		      wordBreakingHint: 'Lewo = ostrożnie (mniej podziałów), prawo = agresywnie (więcej podziałów).',
		      suggestBreaks: 'Zaproponuj podział linii',
		      removeBreaks: 'Usuń podziały linii',
			      allowOverflowTitle: 'Zezwól na przepełnienie',
			      allowOverflowHint: 'Eksportuj pełny tekst nawet jeśli wychodzi poza bezpieczny obszar urządzenia.',
			      allowOverflowSwitchTitle: 'Gdy włączone, pobieranie/wysyłanie BLE używa pełnego tekstu źródłowego nawet jeśli wychodzi poza bezpieczny obszar urządzenia.',
			      previewLvglHint: '',
			      entryTitleLabel: 'Tytuł',
			      entryDescLabel: 'Opis',
			      entryDescPlaceholder: 'Opis (wiele linii)',
			      previewLabel: 'Podgląd',
			      deviceOverlayTitle: 'Intencja',
		      connect: 'Połącz',
		      refresh: 'Odśwież',
		      disconnect: 'Rozłącz',
		      upload: 'Wyślij do urządzenia (BLE)',
		      download: 'Pobierz z urządzenia (BLE)',
		      prev: 'Poprzedni',
		      next: 'Następny',
		      addEntry: 'Dodaj wpis',
		      fillFromTitles: 'Uzupełnij z tytułów',
		      downloadBin: 'Zapisz partition.bin',
		      saveJson: 'Zapisz intentions.json',
			      notConnected: 'Nie połączono.',
			      errConnectFirst: 'Nie połączono. Najpierw kliknij „Połącz”.',
			      errGeneratedPartitionSize: 'Wygenerowana partycja ma rozmiar {len}, oczekiwano 20480.',
			      errDeviceConsent: 'Urządzenie wymaga potwierdzenia. Naciśnij „Allow” na urządzeniu i spróbuj ponownie.',
			      statusNoFileLoaded: 'Brak pliku. Dodaj wpisy albo wgraj .bin/.json.',
		      statusDeletedEntry: 'Usunięto wpis.',
		      statusMovedEntry: 'Przeniesiono wpis.',
		      statusAddedEntry: 'Dodano nowy wpis.',
		      statusMaxEntries: 'Osiągnięto maksymalnie {max} wpisów.',
		      statusLoaded: 'Wczytano: {label}',
		      statusParseNvsFailed: 'Nie udało się odczytać partycji NVS (zobacz konsolę).',
		      statusParseJsonFailed: 'Nie udało się odczytać pliku intentions.json (zobacz konsolę).',
		      statusInternalBinLen: 'Błąd wewnętrzny: długość {len}, oczekiwano 20480',
		      statusGeneratedBin: 'Wygenerowano partition.bin (20480 bajtów).',
		      statusBuildFailed: 'Nie udało się zbudować partycji (zobacz konsolę).',
		      statusConnecting: 'Łączenie…',
		      statusConnected: 'Połączono.',
		      statusDisconnected: 'Rozłączono.',
		      statusDisconnecting: 'Rozłączanie…',
		      statusBleUploadStart: 'Wysyłanie intencji przez BLE…',
		      statusBleUploadProgress: 'Wysyłanie przez BLE… {pct}%',
			      statusBleUploadDone: 'Wysyłanie intencji przez BLE zakończone.',
			      statusBleUploadFailed: 'BLE upload nieudany.',
			      statusBleDownloadStart: 'Pobieranie intencji przez BLE…',
			      statusBleDownloadDone: 'Pobrano {count} intencji z urządzenia.',
			      statusBleDownloadFailed: 'Pobieranie BLE nieudane.',
			      statusBleConnectFailed: 'Nie udało się połączyć przez BLE.',
			      statusBleDisconnectFailed: 'Nie udało się rozłączyć BLE.',
			      statusSavedJson: 'Zapisano intentions.json.',
		      statusSaveJsonFailed: 'Nie udało się zapisać intentions.json (zobacz konsolę).',
		      wordBreakLow: 'Nisko',
		      wordBreakMedium: 'Średnio',
		      wordBreakHigh: 'Wysoko',
		      intentionsTitle: 'Harmonogram intencji',
		      intentionsIntro: 'Sprawdź intencje na różańcu, ustaw daty startu i tajemnice, a następnie wyślij harmonogram do urządzenia.',
		      intentionsErase: 'Wymaż partycję',
		      intentionsSave: 'Zapisz zmiany',
		      intentionsAutoLabel: 'Włącz automatyczny wybór na podstawie dat startu',
		      intentionsHint: 'Aktywna intencja to ostatni wpis, którego data startu jest dziś lub wcześniej (00:00 UTC).',
			      intentionsEmpty: 'Połącz i odśwież, aby wczytać intencje z urządzenia.',
			      entryFallback: 'Wpis {n}',
				      entryMoveUpShort: '↑',
				      entryMoveDownShort: '↓',
				      entryDeleteShort: 'Usuń',
			      entryEditShort: 'Edytuj',
			      entryMoveUpTitle: 'Przenieś w górę',
			      entryMoveDownTitle: 'Przenieś w dół',
			      entryDeleteTitle: 'Usuń wpis',
			      entryEditTitle: 'Edytuj wpis',
			      previewOverflowScroll: 'przepełnienie (scroll)',
			      previewOverflowSourceKept: 'przepełnienie (tekst zachowany)',
			      previewLinesOne: '{n} linia',
			      previewLinesFew: '{n} linie',
			      previewLinesMany: '{n} linii',
			      editEntry: 'Edytuj',
		      collapseEdit: 'Zwiń',
		      descShow: 'Pokaż opis',
		      descHide: 'Ukryj opis',
		      tableIndex: '#',
		      tableTitle: 'Intencja',
		      tableStart: 'Data startu',
		      tableSet: 'Tajemnice',
		      tablePart: 'Część',
		      setsNone: 'Brak',
		      setsJoyful: 'Radosne',
		      setsLuminous: 'Światła',
		      setsSorrowful: 'Bolesne',
		      setsGlorious: 'Chwalebne',
		      setsChaplet: 'Koronka',
		      statusEraseStart: 'Wymazywanie partycji intencji…',
		      statusEraseDone: 'Wymazano partycję intencji.',
		      statusEraseFailed: 'Nie udało się wymazać partycji (zobacz konsolę).',
		      statusSchedSaved: 'Zapisano harmonogram intencji.',
		      statusSchedSaveFailed: 'Nie udało się zapisać harmonogramu (zobacz konsolę).',
		      fwUpdateAvailable: ({ current, latest }) => `Dostępna aktualizacja oprogramowania: ${current} → ${latest}`,
		      fwUpdateOpenInstaller: 'Aktualizuj',
		    },
			    en: {
			      title: 'SmartRosary — Intentions',
			      themeLight: 'Light',
			      themeDark: 'Dark',
			      themeSwitchToLightTitle: 'Switch to light mode',
			      themeSwitchToDarkTitle: 'Switch to dark mode',
			      pillDevice: 'Device: {v}',
			      pillFW: 'FW: {v}',
			      dataSource: 'Overview',
			      entries: 'Entries',
			      entriesCountLabel: 'Entries',
			      utilLabel: 'Utilization',
		      editor: 'Editor',
		      backupRestore: 'Backup & Restore',
		      restore: 'Load from file…',
		      bleReqHint: '',
		      previewSettings: 'Preview Settings',
		      dataSourceStatusHint: '',
		      dataSourceHint: '',
		      bleHint: '',
		      previewSettingsLangHint: '',
		      wordBreaking: 'Word breaking',
		      wordBreakingHint: 'Left = conservative (fewer breaks), right = aggressive (more breaks).',
		      suggestBreaks: 'Suggest line breaks',
		      removeBreaks: 'Remove line breaks',
			      allowOverflowTitle: 'Allow overflow',
			      allowOverflowHint: 'Export full text even if it overflows the device safe area.',
			      allowOverflowSwitchTitle: 'When enabled, download/BLE upload uses the full source text even if it overflows the device safe area.',
			      previewLvglHint: '',
			      entryTitleLabel: 'Title',
			      entryDescLabel: 'Description',
			      entryDescPlaceholder: 'Multi-line description',
			      previewLabel: 'Preview',
			      deviceOverlayTitle: 'Intention',
		      connect: 'Connect',
		      refresh: 'Refresh',
		      disconnect: 'Disconnect',
		      upload: 'Upload to device (BLE)',
		      download: 'Download from device (BLE)',
		      prev: 'Prev',
		      next: 'Next',
		      addEntry: 'Add Entry',
		      fillFromTitles: 'Fill from Titles',
		      downloadBin: 'Save partition.bin',
		      saveJson: 'Save intentions.json',
			      notConnected: 'Not connected.',
			      errConnectFirst: 'Not connected. Click “Connect” first.',
			      errGeneratedPartitionSize: 'Generated partition has size {len}, expected 20480.',
			      errDeviceConsent: 'Device requires consent. Tap “Allow” on the device, then try again.',
			      statusNoFileLoaded: 'No file loaded. Add entries or upload a .bin/.json.',
		      statusDeletedEntry: 'Deleted entry.',
		      statusMovedEntry: 'Moved entry.',
		      statusAddedEntry: 'Added a new entry.',
		      statusMaxEntries: 'Maximum of {max} entries reached.',
		      statusLoaded: 'Loaded: {label}',
		      statusParseNvsFailed: 'Failed to parse NVS partition (see console).',
		      statusParseJsonFailed: 'Failed to parse intentions JSON (see console).',
		      statusInternalBinLen: 'Internal error: bin length {len}, expected 20480',
		      statusGeneratedBin: 'Generated partition.bin (20480 bytes).',
		      statusBuildFailed: 'Failed to build partition (see console).',
		      statusConnecting: 'Connecting…',
		      statusConnected: 'Connected.',
		      statusDisconnected: 'Disconnected.',
		      statusDisconnecting: 'Disconnecting…',
		      statusBleUploadStart: 'Starting BLE intentions upload…',
		      statusBleUploadProgress: 'BLE upload in progress… {pct}%',
			      statusBleUploadDone: 'Intentions upload via BLE complete.',
			      statusBleUploadFailed: 'BLE upload failed.',
			      statusBleDownloadStart: 'Downloading intentions via BLE…',
			      statusBleDownloadDone: 'Downloaded {count} intentions from device.',
			      statusBleDownloadFailed: 'BLE download failed.',
			      statusBleConnectFailed: 'BLE connect failed.',
			      statusBleDisconnectFailed: 'BLE disconnect failed.',
			      statusSavedJson: 'Saved intentions.json.',
		      statusSaveJsonFailed: 'Failed to save intentions.json (see console).',
		      wordBreakLow: 'Low',
		      wordBreakMedium: 'Medium',
		      wordBreakHigh: 'High',
		      intentionsTitle: 'Intentions Scheduler',
		      intentionsIntro: 'Review monthly intentions stored on the rosary, adjust start dates and mysteries, then push the schedule back to the device.',
		      intentionsErase: 'Erase partition',
		      intentionsSave: 'Save Changes',
		      intentionsAutoLabel: 'Enable automatic selection based on start dates',
		      intentionsHint: 'The active intention is the latest entry whose start date is on or before today (stored at 00:00 UTC).',
			      intentionsEmpty: 'Connect and load to view intentions stored on the device.',
			      entryFallback: 'Entry {n}',
				      entryMoveUpShort: '↑',
				      entryMoveDownShort: '↓',
				      entryDeleteShort: 'Del',
			      entryEditShort: 'Edit',
			      entryMoveUpTitle: 'Move up',
			      entryMoveDownTitle: 'Move down',
			      entryDeleteTitle: 'Delete entry',
			      entryEditTitle: 'Edit entry',
			      previewOverflowScroll: 'overflow (scroll)',
			      previewOverflowSourceKept: 'overflow (source kept)',
			      previewLinesOne: '{n} line',
			      previewLinesMany: '{n} lines',
			      editEntry: 'Edit',
		      collapseEdit: 'Collapse',
		      descShow: 'Show description',
		      descHide: 'Hide description',
		      tableIndex: '#',
		      tableTitle: 'Intention',
		      tableStart: 'Start Date',
		      tableSet: 'Mystery',
		      tablePart: 'Part',
		      setsNone: 'None',
		      setsJoyful: 'Joyful',
		      setsLuminous: 'Luminous',
		      setsSorrowful: 'Sorrowful',
		      setsGlorious: 'Glorious',
		      setsChaplet: 'Chaplet',
		      statusEraseStart: 'Erasing intentions partition…',
		      statusEraseDone: 'Erased intentions partition.',
		      statusEraseFailed: 'Failed to erase partition (see console).',
		      statusSchedSaved: 'Saved intentions scheduler.',
		      statusSchedSaveFailed: 'Failed to save scheduler (see console).',
		      fwUpdateAvailable: ({ current, latest }) => `Firmware update available: ${current} → ${latest}`,
		      fwUpdateOpenInstaller: 'Update',
		    },
			    de: {
			      title: 'SmartRosary — Anliegen',
			      themeLight: 'Hell',
			      themeDark: 'Dunkel',
			      themeSwitchToLightTitle: 'Zum hellen Design wechseln',
			      themeSwitchToDarkTitle: 'Zum dunklen Design wechseln',
			      pillDevice: 'Gerät: {v}',
			      pillFW: 'FW: {v}',
			      dataSource: 'Übersicht',
			      entries: 'Einträge',
			      entriesCountLabel: 'Einträge',
			      utilLabel: 'Auslastung',
		      editor: 'Editor',
		      backupRestore: 'Sichern & Wiederherstellen',
		      restore: 'Aus Datei laden…',
		      bleReqHint: '',
		      previewSettings: 'Vorschau-Einstellungen',
		      dataSourceStatusHint: 'Status wird oben angezeigt.',
		      dataSourceHint: '',
		      bleHint: '',
		      previewSettingsLangHint: '',
		      wordBreaking: 'Worttrennung',
		      wordBreakingHint: 'Links = konservativ (weniger Trennungen), rechts = aggressiv (mehr Trennungen).',
		      suggestBreaks: 'Zeilenumbrüche vorschlagen',
		      removeBreaks: 'Zeilenumbrüche entfernen',
			      allowOverflowTitle: 'Überlauf erlauben',
			      allowOverflowHint: 'Vollen Text exportieren, auch wenn er den sicheren Bereich überschreitet.',
			      allowOverflowSwitchTitle: 'Wenn aktiviert, verwendet Download/BLE-Upload den vollständigen Quelltext, auch wenn er den sicheren Bereich überschreitet.',
			      previewLvglHint: '',
			      entryTitleLabel: 'Titel',
			      entryDescLabel: 'Beschreibung',
			      entryDescPlaceholder: 'Mehrzeilige Beschreibung',
			      previewLabel: 'Vorschau',
			      deviceOverlayTitle: 'Anliegen',
		      connect: 'Verbinden',
		      refresh: 'Aktualisieren',
		      disconnect: 'Trennen',
		      upload: 'Zum Gerät senden (BLE)',
		      download: 'Vom Gerät laden (BLE)',
		      prev: 'Zurück',
		      next: 'Weiter',
		      addEntry: 'Eintrag hinzufügen',
		      fillFromTitles: 'Aus Titeln füllen',
		      downloadBin: 'partition.bin speichern',
		      saveJson: 'intentions.json speichern',
			      notConnected: 'Nicht verbunden.',
			      errConnectFirst: 'Nicht verbunden. Zuerst „Verbinden“ klicken.',
			      errGeneratedPartitionSize: 'Erzeugte Partition hat Größe {len}, erwartet 20480.',
			      errDeviceConsent: 'Gerät erfordert Zustimmung. Tippe auf dem Gerät auf „Allow“ und versuche es erneut.',
			      statusNoFileLoaded: 'Keine Datei geladen. Einträge hinzufügen oder .bin/.json hochladen.',
		      statusDeletedEntry: 'Eintrag gelöscht.',
		      statusMovedEntry: 'Eintrag verschoben.',
		      statusAddedEntry: 'Neuen Eintrag hinzugefügt.',
		      statusMaxEntries: 'Maximal {max} Einträge erreicht.',
		      statusLoaded: 'Geladen: {label}',
		      statusParseNvsFailed: 'NVS-Partition konnte nicht gelesen werden (siehe Konsole).',
		      statusParseJsonFailed: 'intentions.json konnte nicht gelesen werden (siehe Konsole).',
		      statusInternalBinLen: 'Interner Fehler: Länge {len}, erwartet 20480',
		      statusGeneratedBin: 'partition.bin erzeugt (20480 Bytes).',
		      statusBuildFailed: 'Partition konnte nicht gebaut werden (siehe Konsole).',
		      statusConnecting: 'Verbinden…',
		      statusConnected: 'Verbunden.',
		      statusDisconnected: 'Getrennt.',
		      statusDisconnecting: 'Trennen…',
		      statusBleUploadStart: 'BLE-Upload wird gestartet…',
		      statusBleUploadProgress: 'BLE-Upload läuft… {pct}%',
			      statusBleUploadDone: 'BLE-Upload abgeschlossen.',
			      statusBleUploadFailed: 'BLE-Upload fehlgeschlagen.',
			      statusBleDownloadStart: 'Lade Anliegen per BLE…',
			      statusBleDownloadDone: '{count} Anliegen vom Gerät geladen.',
			      statusBleDownloadFailed: 'BLE-Download fehlgeschlagen.',
			      statusBleConnectFailed: 'BLE-Verbindung fehlgeschlagen.',
			      statusBleDisconnectFailed: 'BLE-Trennen fehlgeschlagen.',
			      statusSavedJson: 'intentions.json gespeichert.',
		      statusSaveJsonFailed: 'intentions.json konnte nicht gespeichert werden (siehe Konsole).',
		      wordBreakLow: 'Niedrig',
		      wordBreakMedium: 'Mittel',
		      wordBreakHigh: 'Hoch',
		      intentionsTitle: 'Anliegen-Planer',
		      intentionsIntro: 'Überprüfe die Anliegen auf dem Rosenkranz, passe Startdaten und Geheimnisse an und speichere den Plan auf dem Gerät.',
		      intentionsErase: 'Partition löschen',
		      intentionsSave: 'Änderungen speichern',
		      intentionsAutoLabel: 'Automatische Auswahl anhand der Startdaten aktivieren',
		      intentionsHint: 'Aktiv ist der letzte Eintrag, dessen Startdatum heute oder früher ist (00:00 UTC).',
			      intentionsEmpty: 'Verbinden und laden, um Anliegen vom Gerät anzuzeigen.',
			      entryFallback: 'Eintrag {n}',
				      entryMoveUpShort: '↑',
				      entryMoveDownShort: '↓',
				      entryDeleteShort: 'Löschen',
			      entryEditShort: 'Bearbeiten',
			      entryMoveUpTitle: 'Nach oben verschieben',
			      entryMoveDownTitle: 'Nach unten verschieben',
			      entryDeleteTitle: 'Eintrag löschen',
			      entryEditTitle: 'Eintrag bearbeiten',
			      previewOverflowScroll: 'Überlauf (Scroll)',
			      previewOverflowSourceKept: 'Überlauf (Text behalten)',
			      previewLinesOne: '{n} Zeile',
			      previewLinesMany: '{n} Zeilen',
			      editEntry: 'Bearbeiten',
		      collapseEdit: 'Einklappen',
		      descShow: 'Beschreibung anzeigen',
		      descHide: 'Beschreibung verbergen',
		      tableIndex: '#',
		      tableTitle: 'Anliegen',
		      tableStart: 'Startdatum',
		      tableSet: 'Geheimnisse',
		      tablePart: 'Teil',
		      setsNone: 'Keins',
		      setsJoyful: 'Freudenreiche',
		      setsLuminous: 'Lichtreiche',
		      setsSorrowful: 'Schmerzensreiche',
		      setsGlorious: 'Glorreiche',
		      setsChaplet: 'Korone',
		      statusEraseStart: 'Anliegen-Partition wird gelöscht…',
		      statusEraseDone: 'Anliegen-Partition gelöscht.',
		      statusEraseFailed: 'Partition konnte nicht gelöscht werden (siehe Konsole).',
		      statusSchedSaved: 'Anliegen-Planer gespeichert.',
		      statusSchedSaveFailed: 'Planer konnte nicht gespeichert werden (siehe Konsole).',
		      fwUpdateAvailable: ({ current, latest }) => `Firmware-Update verfügbar: ${current} → ${latest}`,
		      fwUpdateOpenInstaller: 'Aktualisieren',
		    },
		  };

		  function tr(key, vars) {
		    const lang = getUiLang();
		    const t = UI_STRINGS[lang] || UI_STRINGS.en;
		    const raw = t[key] ?? UI_STRINGS.en[key] ?? String(key);
		    return String(raw).replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
		  }

		  function getUiLang() {
		    return getEditorLang();
		  }

			  function applyUiLang() {
			    const lang = getUiLang();
			    const t = UI_STRINGS[lang] || UI_STRINGS.en;
			    try { document.documentElement.lang = lang; } catch {}
			    if (titleTxt) titleTxt.textContent = t.title;
			    if (dataSourceTitle) dataSourceTitle.textContent = t.dataSource;
			    if (entriesTitle) entriesTitle.textContent = t.entries;
			    if (editorTitle) editorTitle.textContent = t.editor;
		    if (intentionsTitleEl) intentionsTitleEl.textContent = t.intentionsTitle;
		    if (intentionsIntroEl) intentionsIntroEl.textContent = t.intentionsIntro;
		    if (intentionsEraseBtn) intentionsEraseBtn.textContent = t.intentionsErase;
		    if (intentionsSaveBtn) intentionsSaveBtn.textContent = t.intentionsSave;
		    if (intentionsAutoLabelEl) intentionsAutoLabelEl.textContent = t.intentionsAutoLabel;
		    if (intentionsHintEl) intentionsHintEl.textContent = t.intentionsHint;
		    if (intentionsEmptyEl) intentionsEmptyEl.textContent = t.intentionsEmpty;
		    if (entriesCountLabelEl) entriesCountLabelEl.textContent = t.entriesCountLabel || t.entries;
		    if (utilLabelEl) utilLabelEl.textContent = t.utilLabel || 'Partition';
		    const backupRestoreTitle = el('backupRestoreTitle');
		    if (backupRestoreTitle) backupRestoreTitle.textContent = t.backupRestore;
		    if (btnRestoreFile) btnRestoreFile.textContent = t.restore;
		    const bleReqHint = el('bleReqHint');
		    if (bleReqHint) bleReqHint.textContent = t.bleReqHint;
		    const previewSettingsTitle = el('previewSettingsTitle');
		    if (previewSettingsTitle) previewSettingsTitle.textContent = t.previewSettings;
		    const dataSourceHint = el('dataSourceHint');
		    if (dataSourceHint) dataSourceHint.textContent = '';
		    const bleHint = el('bleHint');
		    if (bleHint) bleHint.textContent = '';
		    const previewSettingsLangHint = el('previewSettingsLangHint');
		    if (previewSettingsLangHint) previewSettingsLangHint.textContent = t.previewSettingsLangHint;
		    const wordBreakingLabel = el('wordBreakingLabel');
		    if (wordBreakingLabel) wordBreakingLabel.textContent = t.wordBreaking;
		    const wordBreakingHint = el('wordBreakingHint');
		    if (wordBreakingHint) wordBreakingHint.textContent = t.wordBreakingHint;
		    const entryTitleLabel = el('entryTitleLabel');
		    if (entryTitleLabel) entryTitleLabel.textContent = t.entryTitleLabel || 'Title';
		    const entryDescLabel = el('entryDescLabel');
		    if (entryDescLabel) entryDescLabel.textContent = t.entryDescLabel || 'Description';
		    if (descEl && t.entryDescPlaceholder) descEl.placeholder = t.entryDescPlaceholder;
		    const previewLabel = el('previewLabel');
		    if (previewLabel) previewLabel.textContent = t.previewLabel || 'Preview';
		    const deviceOverlayTitle = el('deviceOverlayTitle');
		    if (deviceOverlayTitle) deviceOverlayTitle.textContent = t.deviceOverlayTitle || 'Intention';
		    const allowOverflowTitle = el('allowOverflowTitle');
		    if (allowOverflowTitle) allowOverflowTitle.textContent = t.allowOverflowTitle;
		    const allowOverflowHint = el('allowOverflowHint');
		    if (allowOverflowHint) allowOverflowHint.textContent = t.allowOverflowHint;
		    const allowOverflowSwitch = el('allowOverflowSwitch');
		    if (allowOverflowSwitch && t.allowOverflowSwitchTitle) allowOverflowSwitch.title = t.allowOverflowSwitchTitle;
		    const previewLvglHint = el('previewLvglHint');
		    if (previewLvglHint) previewLvglHint.textContent = '';

		    if (btnBleConnect) btnBleConnect.textContent = t.connect;
		    if (btnBleRefresh) btnBleRefresh.textContent = t.refresh;
		    if (btnBleDisconnect) btnBleDisconnect.textContent = t.disconnect;
		    if (btnBleUpload) btnBleUpload.textContent = t.upload;

		    if (btnPrev) btnPrev.textContent = t.prev;
		    if (btnNext) btnNext.textContent = t.next;
		    if (btnAddEntry) btnAddEntry.textContent = t.addEntry;
		    if (btnSyncFromTitles) btnSyncFromTitles.textContent = t.fillFromTitles;
		    if (btnDownload) btnDownload.textContent = t.downloadBin;
		    if (btnSaveJson) btnSaveJson.textContent = t.saveJson;
		    if (btnSuggestBreaks) btnSuggestBreaks.textContent = t.suggestBreaks;
		    if (btnClearBreaks) btnClearBreaks.textContent = t.removeBreaks;
		    renderMonthsList();
			    updateDetailPanel();
			    renderSchedulerTable();
			    refreshStatusForLang();
			    try {
			      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
			      applyTheme(currentTheme);
			    } catch {}
			    renderOverviewPills();
			  }

			  function renderOverviewPills() {
			    const unknown = '—';
			    if (pillDeviceEl) pillDeviceEl.textContent = tr('pillDevice', { v: overviewDeviceName || unknown });
			    if (pillFWEl) pillFWEl.textContent = tr('pillFW', { v: overviewFirmware || unknown });
			  }

			  async function readDeviceInformation() {
			    if (!bleDevice?.gatt?.connected) return { deviceName: null, firmware: null };
			    const deviceName = bleDevice.name ? String(bleDevice.name) : null;
			    let firmware = null;
			    try {
			      const svc = await bleDevice.gatt.getPrimaryService('device_information');
			      const fwChar = await svc.getCharacteristic('firmware_revision_string');
			      const dv = await fwChar.readValue();
			      firmware = new TextDecoder().decode(dv.buffer).replace(/\0+$/g, '').trim() || null;
			    } catch {
			      firmware = null;
			    }
			    return { deviceName, firmware };
			  }

		  function formatPreviewLineCount(n) {
		    const lang = getUiLang();
		    const count = Number(n) || 0;
		    if (lang === 'pl') {
		      if (count === 1) return tr('previewLinesOne', { n: count });
		      const mod10 = count % 10;
		      const mod100 = count % 100;
		      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return tr('previewLinesFew', { n: count });
		      return tr('previewLinesMany', { n: count });
		    }
		    if (count === 1) return tr('previewLinesOne', { n: count });
		    return tr('previewLinesMany', { n: count });
		  }

  function hyphenationLimits() {
    const a = clamp(hyphenAggressionValue / 100, 0, 1); // 0 conservative → 1 aggressive
    const minPrefixChars = Math.round(6 - a * 4); // 6 → 2
    const minSuffixChars = Math.round(5 - a * 3); // 5 → 2
    const minRemainingPx = Math.round(54 - a * 34); // 54 → 20
    return { minPrefixChars, minSuffixChars, minRemainingPx };
  }

	  function getBorderClearancePx() {
	    return 2;
	  }

  function updateHyphenAggressionUI() {
    if (!hyphenAggression) return;
    const v = parseInt(hyphenAggression.value || '45', 10);
    hyphenAggressionValue = clamp(Number.isFinite(v) ? v : 45, 0, 100);
	    if (hyphenAggressionLabel) {
	      if (hyphenAggressionValue <= 20) hyphenAggressionLabel.textContent = tr('wordBreakLow');
	      else if (hyphenAggressionValue <= 60) hyphenAggressionLabel.textContent = tr('wordBreakMedium');
	      else hyphenAggressionLabel.textContent = tr('wordBreakHigh');
	    }
    try { localStorage.setItem('hyphenAggression', String(hyphenAggressionValue)); } catch {}
  }

  function clampIndex() {
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= model.numIntentions) currentIndex = model.numIntentions - 1;
    if (currentIndex < 0) currentIndex = 0;
  }

		  function renderMonthsList() {
		    monthsListEl.innerHTML = '';
		    for (let i = 0; i < model.numIntentions; i++) {
		      const li = document.createElement('li');
		      const title = model.titles[i] || tr('entryFallback', { n: i + 1 });
		      const titleSpan = document.createElement('span');
		      titleSpan.className = 'entry-title';
		      titleSpan.textContent = title;
		      const actions = document.createElement('div');
		      actions.className = 'entry-actions';
		      const btnUp = document.createElement('button');
		      btnUp.type = 'button';
		      btnUp.className = 'secondary';
		      btnUp.textContent = tr('entryMoveUpShort');
		      btnUp.title = tr('entryMoveUpTitle');
		      btnUp.disabled = i === 0;
		      const btnDown = document.createElement('button');
		      btnDown.type = 'button';
		      btnDown.className = 'secondary';
		      btnDown.textContent = tr('entryMoveDownShort');
		      btnDown.title = tr('entryMoveDownTitle');
		      btnDown.disabled = i === model.numIntentions - 1;
	      const btnDel = document.createElement('button');
	      btnDel.type = 'button';
	      btnDel.className = 'danger';
	      btnDel.textContent = tr('entryDeleteShort');
	      btnDel.title = tr('entryDeleteTitle');
		      const btnEdit = document.createElement('button');
		      btnEdit.type = 'button';
		      btnEdit.textContent = tr('entryEditShort');
		      btnEdit.title = tr('entryEditTitle');
	      actions.appendChild(btnUp);
	      actions.appendChild(btnDown);
	      actions.appendChild(btnEdit);
	      actions.appendChild(btnDel);
	      li.appendChild(titleSpan);
	      li.appendChild(actions);
	      if (i === currentIndex) li.classList.add('active');
	      li.addEventListener('click', () => {
	        currentIndex = i;
	        updateDetailPanel();
	        renderMonthsList();
	      });
	      btnUp.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); moveEntry(i, i - 1); });
	      btnDown.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); moveEntry(i, i + 1); });
	      btnEdit.addEventListener('click', (ev) => {
	        ev.preventDefault();
	        ev.stopPropagation();
	        currentIndex = i;
	        updateDetailPanel();
	        renderMonthsList();
	        titleEl?.focus?.();
	      });
	      btnDel.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); deleteEntry(i); });
	      monthsListEl.appendChild(li);
	    }
	  }

		  function syncISFromTitles() {
		    const lines = [];
		    for (let i = 0; i < model.numIntentions; i++) lines.push(model.titles[i] || '');
		    model.iS = lines.join('\n');
		    if (iSEl) iSEl.value = model.iS;
		  }

		  function deleteEntry(index) {
		    if (model.numIntentions <= 0) return;
		    const i = clamp(index | 0, 0, model.numIntentions - 1);
		    model.titles.splice(i, 1);
		    model.descs.splice(i, 1);
		    model.descsSource.splice(i, 1);
		    model.schedStarts.splice(i, 1);
		    model.schedSets.splice(i, 1);
		    model.schedParts.splice(i, 1);
		    model.numIntentions -= 1;
		    resizeArrays(model.numIntentions);
		    syncISFromTitles();
		    markSchedulerDirty();
		    if (currentIndex > i) currentIndex -= 1;
		    if (currentIndex >= model.numIntentions) currentIndex = Math.max(0, model.numIntentions - 1);
		    updateUIFromModel();
			    setStatusKey('statusDeletedEntry', 'ok');
		  }

		  function moveEntry(fromIndex, toIndex) {
		    if (model.numIntentions <= 1) return;
		    const from = clamp(fromIndex | 0, 0, model.numIntentions - 1);
		    const to = clamp(toIndex | 0, 0, model.numIntentions - 1);
		    if (from === to) return;

		    const move = (arr) => {
		      const [v] = arr.splice(from, 1);
		      arr.splice(to, 0, v);
		    };
		    move(model.titles);
		    move(model.descs);
		    move(model.descsSource);
		    move(model.schedStarts);
		    move(model.schedSets);
		    move(model.schedParts);
		    syncISFromTitles();
		    markSchedulerDirty();

	    if (currentIndex === from) currentIndex = to;
	    else if (from < currentIndex && currentIndex <= to) currentIndex -= 1;
	    else if (to <= currentIndex && currentIndex < from) currentIndex += 1;

	    updateUIFromModel();
	    setStatusKey('statusMovedEntry', 'ok');
	  }

		  function updateDetailPanel() {
		    clampIndex();
		    if (totalEntriesEl) totalEntriesEl.textContent = String(model.numIntentions);
		    if (entriesCountEl) entriesCountEl.textContent = String(model.numIntentions);
		    if (model.numIntentions <= 0) {
		      if (currentMonthEl) currentMonthEl.textContent = '—';
		      titleEl.value = '';
		      descEl.value = '';
	      titleEl.disabled = true;
	      descEl.disabled = true;
	      if (btnPrev) btnPrev.disabled = true;
	      if (btnNext) btnNext.disabled = true;
	      renderMonthsList();
	      scheduleDevicePreview();
	      return;
	    }
	    if (currentMonthEl) currentMonthEl.textContent = String(currentIndex + 1);
	    titleEl.disabled = false;
	    descEl.disabled = false;
	    if (btnPrev) btnPrev.disabled = currentIndex <= 0;
	    if (btnNext) btnNext.disabled = currentIndex >= model.numIntentions - 1;
	    titleEl.value = model.titles[currentIndex] || '';
	    descEl.value = model.descs[currentIndex] || '';
	    scheduleDevicePreview();
	  }

		  function updateFromDetailPanel() {
		    if (model.numIntentions <= 0) return;
		    model.titles[currentIndex] = titleEl.value;
		    model.descs[currentIndex] = descEl.value;
		    syncISFromTitles();
		  }

		  function updateUIFromModel() {
		    numIntentionsEl.value = String(model.numIntentions);
		    if (iSEl) iSEl.value = model.iS || '';
		    renderMonthsList();
		    updateDetailPanel();
		    schedulePreviewUsage();
		    scheduleDevicePreview();
		    renderSchedulerTable();
		  }

  function resizeArrays(n) {
    function resize(arr, n) {
      const out = arr.slice(0, n);
      while (out.length < n) out.push('');
      return out;
    }
    function resizeNum(arr, n, fillValue = 0) {
      const out = arr.slice(0, n).map((v) => Number(v) || 0);
      while (out.length < n) out.push(fillValue);
      return out;
    }
    const prevStarts = Array.isArray(model.schedStarts) ? model.schedStarts.slice() : [];
    const prevSets = Array.isArray(model.schedSets) ? model.schedSets.slice() : [];
    const prevParts = Array.isArray(model.schedParts) ? model.schedParts.slice() : [];
    model.titles = resize(model.titles, n);
    model.descs = resize(model.descs, n);
    model.descsSource = resize(model.descsSource, n);
    model.schedStarts = resizeNum(prevStarts, n, 0);
    model.schedSets = resizeNum(prevSets, n, 0);
    model.schedParts = resizeNum(prevParts, n, 0);
    // Only fill defaults for newly-added slots (or when schedule data is missing).
    const fillUntil = Math.min(n, SCHED_MAX_SLOTS);
    for (let i = prevStarts.length; i < fillUntil; i++) {
      model.schedStarts[i] = defaultMonthStartEpoch(i);
      model.schedSets[i] = 0;
      model.schedParts[i] = 0;
    }
  }

  function defaultMonthStartEpoch(idx) {
    if (idx >= 12) return 0;
    const now = new Date();
    const y = now.getUTCFullYear();
    return Math.floor(Date.UTC(y, idx, 1) / 1000);
  }

  function epochToDateInput(epoch) {
    const e = Number(epoch) || 0;
    if (!e) return '';
    const d = new Date(e * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function dateInputToEpoch(value) {
    if (!value) return 0;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
    const [year, month, day] = parts;
    return Math.floor(Date.UTC(year, month - 1, day) / 1000);
  }

  function getMysteryOptions() {
    const t = UI_STRINGS[getUiLang()] || UI_STRINGS.en;
    const labels = [
      t.setsNone || 'None',
      t.setsJoyful || 'Joyful',
      t.setsLuminous || 'Luminous',
      t.setsSorrowful || 'Sorrowful',
      t.setsGlorious || 'Glorious',
      t.setsChaplet || 'Chaplet',
    ];
    // Match dashboard ordering, with Chaplet appended.
    const order = [
      { idx: 0, value: 0 }, // None
      { idx: 1, value: 1 }, // Joyful
      { idx: 2, value: 2 }, // Luminous
      { idx: 3, value: 3 }, // Sorrowful
      { idx: 4, value: 4 }, // Glorious
      { idx: 5, value: 5 }, // Chaplet
    ];
    return order.map(({ idx, value }) => ({ value, label: labels[idx] }));
  }

  function markSchedulerDirty() {
    schedulerDirty = true;
    updateSchedulerControls();
  }

  function clearSchedulerDirty() {
    schedulerDirty = false;
    updateSchedulerControls();
  }

  function updateSchedulerControls() {
    const hasEntries = (model.numIntentions | 0) > 0;
    if (intentionsAutoEl) {
      intentionsAutoEl.checked = !!model.schedAuto;
      intentionsAutoEl.disabled = !isBleConnectedForPrefs() || !hasEntries;
    }
    if (intentionsSaveBtn) intentionsSaveBtn.disabled = !schedulerDirty || !isBleConnectedForPrefs() || !hasEntries;
    if (intentionsEraseBtn) intentionsEraseBtn.disabled = !isBleConnectedForUpload();
  }

  function resetSchedulerToDefaults() {
    const n = Math.min(model.numIntentions | 0, SCHED_MAX_SLOTS);
    for (let i = 0; i < n; i++) {
      model.schedStarts[i] = defaultMonthStartEpoch(i);
      model.schedSets[i] = 0;
      model.schedParts[i] = 0;
    }
    model.schedAuto = false;
    markSchedulerDirty();
    renderSchedulerTable();
  }

  function renderSchedulerTable() {
    if (!intentionsTbody) return;
    intentionsTbody.innerHTML = '';
    const strings = UI_STRINGS[getUiLang()] || UI_STRINGS.en;
    const tableLabels = {
      index: strings.tableIndex || '#',
      title: strings.tableTitle || 'Intention',
      start: strings.tableStart || 'Start Date',
      set: strings.tableSet || 'Mystery',
      part: strings.tablePart || 'Part',
    };

    const n = Math.min(model.numIntentions | 0, SCHED_MAX_SLOTS);
    if (intentionsEmptyEl) intentionsEmptyEl.style.display = n ? 'none' : 'block';
    if (!n) {
      updateSchedulerControls();
      return;
    }

    const entries = [];
    for (let i = 0; i < n; i++) {
      entries.push({
        index: i,
        title: String(model.titles[i] || ''),
        desc: String((model.descsSource[i] ?? model.descs[i] ?? '') || ''),
        start: Number(model.schedStarts[i]) || 0,
        set: Number(model.schedSets[i]) || 0,
        part: Number(model.schedParts[i]) || 0,
        editing: false,
      });
    }

    entries.forEach((entry) => {
      let updateDisplays = () => {};

      const tr = document.createElement('tr');
      tr.className = 'intentions-row';
      tr.classList.toggle('editing', !!entry.editing);

      const tdIndex = document.createElement('td');
      tdIndex.dataset.label = tableLabels.index;
      const indexWrap = document.createElement('div');
      indexWrap.className = 'intentions-index-wrap';
      const indexNumber = document.createElement('span');
      indexNumber.className = 'intentions-index';
      indexNumber.textContent = String(entry.index + 1);
      indexWrap.appendChild(indexNumber);

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'intentions-toggle';
      const updateToggleLabel = () => {
        toggleBtn.textContent = entry.editing ? (strings.collapseEdit || 'Collapse') : (strings.editEntry || 'Edit');
        toggleBtn.setAttribute('aria-expanded', entry.editing ? 'true' : 'false');
      };
      updateToggleLabel();
      toggleBtn.addEventListener('click', () => {
        entry.editing = !entry.editing;
        tr.classList.toggle('editing', entry.editing);
        updateToggleLabel();
      });
      indexWrap.appendChild(toggleBtn);

      const rawDesc = String(entry.desc || '').trim();
      let descRow = null;
      if (rawDesc.length) {
        const descId = `intent-desc-${entry.index}`;
        const descToggle = document.createElement('button');
        descToggle.type = 'button';
        descToggle.className = 'intentions-desc-toggle';
        descToggle.textContent = '▸';
        descToggle.setAttribute('aria-label', strings.descShow || 'Show description');
        descToggle.setAttribute('aria-controls', descId);
        descToggle.setAttribute('aria-expanded', 'false');

        const descCell = document.createElement('td');
        descCell.colSpan = 5;
        descCell.className = 'intentions-desc-cell';

        const descText = document.createElement('div');
        descText.className = 'intentions-desc-text';
        descText.id = descId;
        descText.textContent = rawDesc;
        descText.setAttribute('aria-hidden', 'true');

        descCell.appendChild(descText);
        descRow = document.createElement('tr');
        descRow.className = 'intentions-desc-row';
        descRow.hidden = true;
        descRow.appendChild(descCell);

        descToggle.addEventListener('click', () => {
          const expanded = descToggle.getAttribute('aria-expanded') === 'true';
          const nextState = !expanded;
          descToggle.textContent = nextState ? '▾' : '▸';
          descToggle.setAttribute('aria-expanded', String(nextState));
          descToggle.setAttribute('aria-label', nextState ? (strings.descHide || 'Hide description') : (strings.descShow || 'Show description'));
          descText.setAttribute('aria-hidden', String(!nextState));
          descRow.hidden = !nextState;
          descRow.classList.toggle('open', nextState);
        });

        indexWrap.appendChild(descToggle);
      }

      tdIndex.appendChild(indexWrap);
      tr.appendChild(tdIndex);

      const tdTitle = document.createElement('td');
      tdTitle.className = 'intentions-title-cell';
      tdTitle.dataset.label = tableLabels.title;

      const titleWrap = document.createElement('div');
      titleWrap.className = 'intentions-title-wrap';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'intentions-title';
      const titleText = entry.title || `${tableLabels.title} ${entry.index + 1}`;
      titleSpan.textContent = titleText;
      titleSpan.title = titleText;
      titleWrap.appendChild(titleSpan);
      tdTitle.appendChild(titleWrap);
      tr.appendChild(tdTitle);

      const tdDate = document.createElement('td');
      tdDate.className = 'intentions-date-cell';
      tdDate.dataset.label = tableLabels.start;
      const inputDate = document.createElement('input');
      inputDate.type = 'date';
      inputDate.value = epochToDateInput(entry.start);
      inputDate.addEventListener('change', () => {
        entry.start = dateInputToEpoch(inputDate.value);
        model.schedStarts[entry.index] = entry.start;
        markSchedulerDirty();
        updateDisplays();
      });
      const showDatePicker = () => {
        try { if (typeof inputDate.showPicker === 'function') inputDate.showPicker(); } catch {}
      };
      inputDate.addEventListener('focus', showDatePicker);
      inputDate.addEventListener('click', showDatePicker);
      const dateDisplay = document.createElement('div');
      dateDisplay.className = 'intentions-display';
      const dateEdit = document.createElement('div');
      dateEdit.className = 'intentions-edit';
      dateEdit.appendChild(inputDate);
      tdDate.appendChild(dateDisplay);
      tdDate.appendChild(dateEdit);
      tr.appendChild(tdDate);

      const tdSet = document.createElement('td');
      tdSet.className = 'intentions-set-cell';
      tdSet.dataset.label = tableLabels.set;
      const selectSet = document.createElement('select');
      getMysteryOptions().forEach((opt) => {
        const option = document.createElement('option');
        option.value = String(opt.value);
        option.textContent = opt.label;
        if (opt.value === entry.set) option.selected = true;
        selectSet.appendChild(option);
      });
      const setDisplay = document.createElement('div');
      setDisplay.className = 'intentions-display';
      const setEdit = document.createElement('div');
      setEdit.className = 'intentions-edit';
      setEdit.appendChild(selectSet);
      tdSet.appendChild(setDisplay);
      tdSet.appendChild(setEdit);
      tr.appendChild(tdSet);

      const tdPart = document.createElement('td');
      tdPart.className = 'intentions-part-cell';
      tdPart.dataset.label = tableLabels.part;
      const selectPart = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = '0';
      blank.textContent = '—';
      selectPart.appendChild(blank);
      for (let i = 1; i <= 5; i++) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = String(i);
        selectPart.appendChild(option);
      }
      selectPart.value = String(entry.part || 0);
      const partDisplay = document.createElement('div');
      partDisplay.className = 'intentions-display';
      const partEdit = document.createElement('div');
      partEdit.className = 'intentions-edit';
      partEdit.appendChild(selectPart);
      tdPart.appendChild(partDisplay);
      tdPart.appendChild(partEdit);
      tr.appendChild(tdPart);

      updateDisplays = () => {
        dateDisplay.textContent = inputDate.value || '—';
        const selectedSet = selectSet.options[selectSet.selectedIndex];
        setDisplay.textContent = selectedSet ? selectedSet.textContent : '—';
        const partVal = Number(selectPart.value) || 0;
        partDisplay.textContent = partVal ? String(partVal) : '—';
      };
      updateDisplays();

      selectSet.addEventListener('change', () => {
        entry.set = Number(selectSet.value) || 0;
        model.schedSets[entry.index] = entry.set;
        markSchedulerDirty();
        updateDisplays();
      });

      selectPart.addEventListener('change', () => {
        entry.part = Number(selectPart.value) || 0;
        model.schedParts[entry.index] = entry.part;
        markSchedulerDirty();
        updateDisplays();
      });

      intentionsTbody.appendChild(tr);
      if (descRow) intentionsTbody.appendChild(descRow);
    });

    updateSchedulerControls();
  }

			  function loadIntentionsFromObject(obj, label) {
		    const titlesIn = Array.isArray(obj?.titles) ? obj.titles.map((v) => String(v ?? '')) : [];
		    const descsIn = Array.isArray(obj?.descs) ? obj.descs.map((v) => String(v ?? '')) : [];
		    const inferredN = Math.max(titlesIn.length, descsIn.length);
		    const nRaw = Number.isFinite(obj?.numIntentions) ? obj.numIntentions : inferredN;
		    const n = clamp((nRaw | 0), 0, 64);

		    model.numIntentions = n;
		    model.titles = titlesIn.slice(0, n);
		    model.descs = descsIn.slice(0, n);
		    model.descsSource = descsIn.slice(0, n);
		    const sched = (obj?.scheduler && typeof obj.scheduler === 'object') ? obj.scheduler : obj;
		    model.schedAuto = !!(sched?.auto ?? sched?.schedAuto);
		    model.schedStarts = Array.isArray(sched?.starts || sched?.schedStarts) ? (sched.starts || sched.schedStarts).map((v) => Number(v) || 0) : [];
		    model.schedSets = Array.isArray(sched?.sets || sched?.schedSets) ? (sched.sets || sched.schedSets).map((v) => Number(v) || 0) : [];
		    model.schedParts = Array.isArray(sched?.parts || sched?.schedParts) ? (sched.parts || sched.schedParts).map((v) => Number(v) || 0) : [];
		    resizeArrays(model.numIntentions);

			    model.iS = model.titles.join('\n');

			    currentIndex = 0;
			    updateUIFromModel();
			    clearSchedulerDirty();
			    setStatusKey('statusLoaded', 'ok', { label: label || 'intentions.json' });
			  }

		  function handleBuffer(buf, label) {
		    if (!buf) return;
		    try {
		      const parsed = NVS.parseIntentions(buf);
		      const parsedN = Number.isFinite(parsed.numIntentions) ? parsed.numIntentions : NaN;
		      const fallbackN = Math.max(
		        Array.isArray(parsed.titles) ? parsed.titles.length : 0,
		        Array.isArray(parsed.descs) ? parsed.descs.length : 0
		      );
		      loadIntentionsFromObject(
		        {
		          numIntentions: clamp(Number.isFinite(parsedN) ? parsedN : fallbackN, 0, 64),
		          iS: parsed.iS || '',
		          titles: parsed.titles || [],
		          descs: parsed.descs || [],
		        },
		        `${label || 'partition.bin'} (${buf.length} bytes)`
		      );
		      setUsageFromBin(buf);
		    } catch (e) {
		      console.error(e);
		      setStatusKey('statusParseNvsFailed', 'danger');
		    }
		  }

		  async function handleFile(file) {
		    if (!file) return;
		    const name = String(file.name || '').toLowerCase();
		    const isJson = name.endsWith('.json') || String(file.type || '').includes('json');
		    if (isJson) {
		      try {
		        const text = await file.text();
		        const obj = JSON.parse(text);
		        loadIntentionsFromObject(obj, file.name);
		      } catch (e) {
		        console.error(e);
		        setStatusKey('statusParseJsonFailed', 'danger');
		      }
		      return;
		    }
		    const buf = new Uint8Array(await file.arrayBuffer());
		    handleBuffer(buf, file.name);
		  }

			  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
			  if (btnRestoreFile) {
			    btnRestoreFile.addEventListener('click', () => {
			      try { fileInput.click(); } catch {}
			    });
			  }

	  if (intentionsAutoEl) {
	    intentionsAutoEl.addEventListener('change', () => {
	      model.schedAuto = !!intentionsAutoEl.checked;
	      markSchedulerDirty();
	    });
	  }
	  if (intentionsSaveBtn) intentionsSaveBtn.addEventListener('click', startBleSchedulerSave);
	  if (intentionsEraseBtn) intentionsEraseBtn.addEventListener('click', startBleIntentionsErasePartition);

  titleEl.addEventListener('input', () => { updateFromDetailPanel(); renderMonthsList(); renderSchedulerTable(); });
  descEl.addEventListener('input', () => { updateFromDetailPanel(); });

	  function updateDescSourceFromEditor() {
	    if (suppressDescSourceUpdate) return;
	    if (model.numIntentions <= 0) return;
	    model.descsSource[currentIndex] = descEl.value;
	  }

  function setDescValueProgrammatically(next) {
    suppressDescSourceUpdate = true;
    descEl.value = next;
    suppressDescSourceUpdate = false;
    updateFromDetailPanel();
  }

		  if (btnPrev) btnPrev.addEventListener('click', () => { updateFromDetailPanel(); currentIndex = Math.max(0, currentIndex - 1); updateDetailPanel(); renderMonthsList(); });
		  if (btnNext) btnNext.addEventListener('click', () => { updateFromDetailPanel(); currentIndex = Math.min(model.numIntentions - 1, currentIndex + 1); updateDetailPanel(); renderMonthsList(); });

		  btnAddEntry.addEventListener('click', () => {
		    updateFromDetailPanel();
		    const max = 64;
		    if (model.numIntentions >= max) {
	      setStatusKey('statusMaxEntries', 'danger', { max });
	      return;
	    }
		    model.numIntentions += 1;
		    resizeArrays(model.numIntentions);
	    // Set auto title for the new entry
	    const newIndex = model.numIntentions - 1;
	    const newTitle = `Entry ${model.numIntentions}`;
	    model.titles[newIndex] = newTitle;
	    syncISFromTitles();
	    currentIndex = newIndex;
	    renderMonthsList();
	    updateDetailPanel();
	    // Reflect auto title into the title field explicitly (updateDetailPanel sets it as well)
	    titleEl.value = newTitle;
		    numIntentionsEl.value = String(model.numIntentions);
		    schedulePreviewUsage();
		    markSchedulerDirty();
		    renderSchedulerTable();
		    setStatusKey('statusAddedEntry', 'ok');
		  });

	  btnDownload.addEventListener('click', () => {
	    updateFromDetailPanel();
	    try {
	      const bin = NVS.buildIntentionsBin(getModelForExport());
		      // Fixed partition size 20480
		      if (bin.length !== 20480) {
		        setStatusKey('statusInternalBinLen', 'danger', { len: bin.length });
		        return;
		      }
      const blob = new Blob([bin], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nvs-intentions.bin';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatusKey('statusGeneratedBin', 'ok');
      setUsageFromBin(bin);
    } catch (e) {
      console.error(e);
      setStatusKey('statusBuildFailed', 'danger');
    }
  });

	  // Initial UI
	  updateUIFromModel();
	  setStatusKey('statusNoFileLoaded', '');

		  // Theme handling
			  function applyTheme(theme) {
			    document.documentElement.setAttribute('data-theme', theme);
			    if (document.body) document.body.classList.toggle('theme-light', theme === 'light');
			    if (!themeToggle) return;
			    const isDark = theme === 'dark';
			    themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
			    themeToggle.textContent = isDark ? tr('themeLight') : tr('themeDark');
			    themeToggle.title = isDark ? tr('themeSwitchToLightTitle') : tr('themeSwitchToDarkTitle');
			  }
	  function initTheme() {
	    const saved = localStorage.getItem('theme');
	    let theme = saved || 'dark';
	    applyTheme(theme);
	  }
	  if (themeToggle) {
	    themeToggle.addEventListener('click', () => {
	      const current = document.documentElement.getAttribute('data-theme') || 'dark';
	      const next = current === 'dark' ? 'light' : 'dark';
	      applyTheme(next);
	      try { localStorage.setItem('theme', next); } catch {}
	    });
	  }
	  initTheme();

  // Utilization
		  function setUsageFromBin(bin) {
		    try {
		      const u = NVS.computeUsage(bin);
		      usageFill.style.width = `${u.percent}%`;
		      if (usageStats) usageStats.textContent = '';
		      if (usagePercentEl) {
		        const used = Number(u.usedBytes) || 0;
		        const usedLabel = used > 1024 ? `${(used / 1024).toFixed(1)} kB` : `${used} bytes`;
		        usagePercentEl.textContent = `${u.percent}% · ${usedLabel}`;
		      }
		    } catch (e) {
		      usageFill.style.width = '0%';
		      if (usageStats) usageStats.textContent = '';
		      if (usagePercentEl) usagePercentEl.textContent = '—';
		    }
		  }

	  function getModelForExport() {
	    if (!allowOverflow) return model;
	    const descs = [];
	    for (let i = 0; i < model.numIntentions; i++) descs.push(model.descsSource[i] ?? model.descs[i] ?? '');
	    return {
	      numIntentions: model.numIntentions,
	      iS: model.iS,
	      titles: model.titles,
	      descs,
	    };
	  }

		  function getDescTextForPreview() {
		    // Preview should reflect what will actually be shown on-device (i.e. the edited/device field).
		    return String(model.descs[currentIndex] ?? '');
		  }

	  function schedulePreviewUsage() {
	    clearTimeout(previewTimer);
	    previewTimer = setTimeout(() => {
	      try {
	        const bin = NVS.buildIntentionsBin(getModelForExport());
	        setUsageFromBin(bin);
	      } catch { /* ignore preview errors */ }
	    }, 150);
	  }

  // Device preview
  function setPreviewHint(text, cls) {
    if (!previewHint) return;
    previewHint.textContent = text || '—';
    previewHint.className = 'pill' + (cls ? ' ' + cls : '');
  }

	  function measureText(ctx, text) {
	    return ctx.measureText(text).width || 0;
	  }

	  function clampSingleLineToWidth(ctx, text, font, maxWidth) {
	    const raw = String(text ?? '');
	    const s = raw.replace(/\r\n?/g, '\n').replace(/\n/g, ' ').replace(/\t/g, ' ');
	    if (!s.trim()) return { text: '', capped: raw.length > 0 };
	    ctx.save();
	    ctx.font = font;
	    const w = measureText(ctx, s);
	    if (w <= maxWidth) {
	      ctx.restore();
	      return { text: s, capped: raw !== s };
	    }
	    const ellipsis = '…';
	    const ellW = measureText(ctx, ellipsis);
	    if (ellW > maxWidth) {
	      ctx.restore();
	      return { text: '', capped: true };
	    }
	    const chars = Array.from(s);
	    let lo = 0;
	    let hi = chars.length;
	    while (lo < hi) {
	      const mid = Math.ceil((lo + hi) / 2);
	      const candidate = chars.slice(0, mid).join('') + ellipsis;
	      if (measureText(ctx, candidate) <= maxWidth) lo = mid;
	      else hi = mid - 1;
	    }
	    const out = chars.slice(0, Math.max(0, lo)).join('') + ellipsis;
	    ctx.restore();
	    return { text: out, capped: true };
	  }

	  function maxItitleWidthPx(marginPx) {
	    const lineHeight = 16;
	    const yMid = LV_ITITLE_Y + Math.round(lineHeight / 2);
	    return computeAllowedWidthForLine(yMid, marginPx, lineHeight);
	  }

	  function updateActiveEntryTitleInList(title) {
	    const node = monthsListEl?.querySelector('li.active .entry-title');
	    if (node) node.textContent = title;
	  }

	  function enforceCurrentTitleCap(ctx) {
	    if (!titleEl) return { capped: false, title: '' };
	    const marginPx = getBorderClearancePx();
	    const maxWidth = maxItitleWidthPx(marginPx);
	    const { text: cappedTitle, capped } = clampSingleLineToWidth(ctx, titleEl.value, FONT_ITITLE, maxWidth);
	    if (titleEl.value !== cappedTitle) titleEl.value = cappedTitle;
	    if (model.titles[currentIndex] !== cappedTitle) model.titles[currentIndex] = cappedTitle;
	    updateActiveEntryTitleInList(cappedTitle || tr('entryFallback', { n: currentIndex + 1 }));
	    return { capped, title: cappedTitle };
	  }

	  function computeAllowedWidthAtY(y, marginPx) {
	    const r = Math.max(0, CIRCLE_R - marginPx);
	    const dy = y - CIRCLE_CY;
	    if (Math.abs(dy) >= r) return 0;
    const half = Math.sqrt((r * r) - (dy * dy));
    return 2 * half;
  }

	  function computeAllowedWidthForLine(yMid, marginPx, lineHeight) {
	    // The clip mask is a circle, but glyphs have vertical extent around the baseline.
	    // Use the most restrictive width across the likely glyph span to avoid edge-clipping
	    // that can make word parts appear "missing".
    const halfSpan = Math.max(6, Math.round(lineHeight * 0.45));
    const w0 = computeAllowedWidthAtY(yMid, marginPx);
    const w1 = computeAllowedWidthAtY(yMid - halfSpan, marginPx);
    const w2 = computeAllowedWidthAtY(yMid + halfSpan, marginPx);
    return Math.min(w0, w1, w2);
  }

	  let letterRegex = null;
  try {
    letterRegex = new RegExp('\\p{L}', 'u');
  } catch {
    letterRegex = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/;
  }

  function isLetter(ch) {
    return letterRegex.test(ch);
  }

  function isPolishDigraph(prev, next) {
    const pair = (prev + next).toLowerCase();
    return pair === 'ch' || pair === 'cz' || pair === 'dz' || pair === 'rz' || pair === 'sz';
  }

  function isPolishTrigraph(a, b, c) {
    const tri = (a + b + c).toLowerCase();
    return tri === 'dż' || tri === 'dź';
  }

  function getHypher(lang) {
    const l = String(lang || '').toLowerCase();
    if (!l.startsWith('pl')) return null;
    try {
      const HypherCtor = globalThis.Hypher;
      const patterns = globalThis.HYPHENATION_PL;
      if (typeof HypherCtor !== 'function' || !patterns) return null;
      return new HypherCtor(patterns);
    } catch {
      return null;
    }
  }

	  const hypherPl = getHypher('pl');
	  const LANG_EN = 'en';
	  const LANG_DE = 'de';
	  const LANG_PL = 'pl';

  function countLetters(s) {
    let n = 0;
    for (const ch of String(s)) if (isLetter(ch)) n++;
    return n;
  }

	  function acceptableHyphenCut(word, cutIdx, minPrefixChars, minSuffixChars) {
	    if (cutIdx <= 0 || cutIdx >= word.length) return false;
	    const left = word.slice(0, cutIdx);
	    const right = word.slice(cutIdx);
	    return countLetters(left) >= minPrefixChars && countLetters(right) >= minSuffixChars;
	  }

	  function isEnDigraph(prev, next) {
	    const pair = (prev + next).toLowerCase();
	    return (
	      pair === 'ch' ||
	      pair === 'sh' ||
	      pair === 'th' ||
	      pair === 'ph' ||
	      pair === 'wh' ||
	      pair === 'ck' ||
	      pair === 'ng' ||
	      pair === 'qu'
	    );
	  }

	  function isDeDigraph(prev, next) {
	    const pair = (prev + next).toLowerCase();
	    return (
	      pair === 'ch' ||
	      pair === 'ck' ||
	      pair === 'ph' ||
	      pair === 'th' ||
	      pair === 'qu'
	    );
	  }

	  function isDeTrigraphAround(chars, i) {
	    // Avoid splitting "sch" (…s|ch… or …sc|h…)
	    const a = chars[i - 2];
	    const b = chars[i - 1];
	    const c = chars[i];
	    const d = chars[i + 1];
	    const left = (b && c && d) ? (b + c + d).toLowerCase() : '';
	    const right = (a && b && c) ? (a + b + c).toLowerCase() : '';
	    return left === 'sch' || right === 'sch';
	  }

	  function avoidCutAt(chars, i, lang) {
	    const prev = chars[i - 1];
	    const next = chars[i];
	    if (!prev || !next) return false;
	    if (!isLetter(prev) || !isLetter(next)) return false;
	    const l = normalizeLang(lang);
	    if (l.startsWith(LANG_PL)) {
	      if (isPolishDigraph(prev, next)) return true;
	      if (i >= 2 && isPolishTrigraph(chars[i - 2], prev, next)) return true;
	      return false;
	    }
	    if (l.startsWith(LANG_DE)) {
	      if (isDeDigraph(prev, next)) return true;
	      if (isDeTrigraphAround(chars, i)) return true;
	      return false;
	    }
	    if (l.startsWith(LANG_EN)) return isEnDigraph(prev, next);
	    return false;
	  }

	  function splitWordOnce(token, ctx, maxWidth, lang) {
	    if (!token) return [''];
	    if (measureText(ctx, token) <= maxWidth) return [token];

	    const l = normalizeLang(lang);
	    const enableHyphen =
	      (l.startsWith(LANG_PL) || l.startsWith(LANG_EN) || l.startsWith(LANG_DE)) &&
	      Array.from(token).some(isLetter);
	    const strictMinChars = l.startsWith(LANG_PL);
	    const hypher = (enableHyphen && l.startsWith(LANG_PL)) ? hypherPl : null;
	    const { minPrefixChars, minSuffixChars } = hyphenationLimits();

	    if (hypher) {
      const frags = hypher.hyphenate(token);
      if (Array.isArray(frags) && frags.length >= 2) {
        let bestCut = -1;
        let prefix = '';
        for (let i = 0; i < frags.length - 1; i++) {
          prefix += frags[i];
          const cutIdx = prefix.length;
          const probe = prefix + '-';
          if (measureText(ctx, probe) <= maxWidth) {
            if (acceptableHyphenCut(token, cutIdx, minPrefixChars, minSuffixChars)) bestCut = cutIdx;
          } else {
            break;
          }
        }
        if (bestCut > 0 && bestCut < token.length) {
          return [token.slice(0, bestCut) + '-', token.slice(bestCut)];
        }
      }
    }

    const chars = Array.from(token);
    let lo = 1;
    let hi = chars.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const prefix = chars.slice(0, mid).join('');
      const probe = enableHyphen ? `${prefix}-` : prefix;
      if (measureText(ctx, probe) <= maxWidth) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

	    if (best <= 0) return [token];

	    let cut = best;
	    if (enableHyphen && cut > 2 && cut < chars.length - 2) {
	      let found = false;
	      for (let i = Math.min(cut, chars.length - 2); i >= 2; i--) {
	        if (avoidCutAt(chars, i, l)) continue;
	        const cutIdx = chars.slice(0, i).join('').length;
	        if (!acceptableHyphenCut(token, cutIdx, minPrefixChars, minSuffixChars)) continue;
	        cut = i;
	        found = true;
	        break;
	      }
	      if (!found && !strictMinChars) {
	        for (let i = Math.min(cut, chars.length - 2); i >= 2; i--) {
	          if (avoidCutAt(chars, i, l)) continue;
	          cut = i;
	          break;
	        }
	      }
	    }

	    const cutIdx = chars.slice(0, cut).join('').length;
	    if (enableHyphen && strictMinChars && !acceptableHyphenCut(token, cutIdx, minPrefixChars, minSuffixChars)) return [token];

	    return [chars.slice(0, cut).join('') + (enableHyphen ? '-' : ''), chars.slice(cut).join('')];
	  }

  function wrapTextForRound(ctx, text, opts) {
    const {
      font,
      lineHeight,
      centerY,
      yMin,
      yMax,
      marginPx,
      maxLines,
    } = opts;

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';

    const normalized = String(text || '')
      .replace(/\r\n?/g, '\n')
      .trim()
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n');

    if (!normalized) {
      ctx.restore();
      return { lines: [''], overflow: false };
    }

    const baseTokens = normalized
      .split(/\s+/g)
      .filter(Boolean)
      .map((t) => ({ t, glue: false }));

    let guess = Math.min(maxLines, Math.max(1, Math.ceil(baseTokens.length / 5)));
    let last = -1;
    let best = { lines: [], overflow: true, remainingTokens: [] };

    for (let iter = 0; iter < 10; iter++) {
      if (guess === last) break;
      last = guess;

      const tokens = baseTokens.map(({ t, glue }) => ({ t, glue }));

      const yStart = centerY - (guess * lineHeight) / 2 + lineHeight / 2;
      const yEnd = yStart + (guess - 1) * lineHeight;
      if (yStart < yMin || yEnd > yMax) {
        guess = Math.max(1, Math.min(maxLines, Math.floor((yMax - yMin) / lineHeight)));
      }

      const yStart2 = centerY - (guess * lineHeight) / 2 + lineHeight / 2;
      const widths = Array.from({ length: guess }, (_, i) =>
        computeAllowedWidthForLine(yStart2 + i * lineHeight, marginPx, lineHeight)
      );

      const out = [];
      let i = 0;
      while (i < tokens.length && out.length < guess) {
        const maxW = widths[out.length] || 0;
        if (maxW <= 0) break;

        if (measureText(ctx, tokens[i].t) > maxW) {
          const pieces = splitWordOnce(tokens[i].t, ctx, maxW, opts.lang);
          tokens.splice(
            i,
            1,
            ...pieces.map((p, idx) => ({ t: p, glue: idx > 0 }))
          );
        }

        let line = tokens[i].t;
        i++;
        while (i < tokens.length) {
          const joiner = tokens[i].glue ? '' : ' ';
          const candidate = line + joiner + tokens[i].t;
          if (measureText(ctx, candidate) <= maxW) {
            line = candidate;
            i++;
          } else {
            // Hyphenate only at the right edge when a word would overflow the border.
            const remaining = maxW - measureText(ctx, line + joiner);
            const { minRemainingPx } = hyphenationLimits();
            if (remaining > minRemainingPx && !tokens[i].glue) {
              const pieces = splitWordOnce(tokens[i].t, ctx, remaining, opts.lang);
              if (pieces.length >= 2 && pieces[0] !== tokens[i].t) {
                line = line + joiner + pieces[0];
                tokens.splice(
                  i,
                  1,
                  ...pieces.slice(1).map((p, idx) => ({ t: p, glue: idx > 0 }))
                );
              }
            }
            break;
          }
        }
        out.push(line);
      }

      const overflow = i < tokens.length;
      best = { lines: out, overflow, remainingTokens: overflow ? tokens.slice(i) : [] };

      if (!overflow) break;
      if (guess >= maxLines) break;
      guess = Math.min(maxLines, out.length + 1);
    }

    ctx.restore();
    return {
      lines: best.lines.length ? best.lines : [''],
      overflow: best.overflow,
      remainingTokens: best.remainingTokens || [],
    };
  }

  function wrapTokensSimple(ctx, tokens, font, maxWidth, lang) {
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';
    const out = [];
    let i = 0;
    while (i < tokens.length) {
      let line = tokens[i].t;
      i++;
      while (i < tokens.length) {
        const joiner = tokens[i].glue ? '' : ' ';
        const candidate = line + joiner + tokens[i].t;
        if (measureText(ctx, candidate) <= maxWidth) {
          line = candidate;
          i++;
        } else {
          const remaining = maxWidth - measureText(ctx, line + joiner);
          const { minRemainingPx } = hyphenationLimits();
          if (remaining > minRemainingPx && !tokens[i].glue) {
            const pieces = splitWordOnce(tokens[i].t, ctx, remaining, lang);
            if (pieces.length >= 2 && pieces[0] !== tokens[i].t) {
              line = line + joiner + pieces[0];
              tokens.splice(
                i,
                1,
                ...pieces.slice(1).map((p, idx) => ({ t: p, glue: idx > 0 }))
              );
            }
          }
          break;
        }
      }
      out.push(line);
    }
    ctx.restore();
    return out;
  }

			  function renderDevicePreview() {
			    if (!previewCanvas) return;
			    const desiredScale = 2;
			    const frameWidth = previewFrame?.clientWidth || (DEVICE_W * desiredScale);
			    const fitScale = frameWidth / DEVICE_W;
		    const scale = clamp(fitScale, 1, desiredScale);

	    const dpr = window.devicePixelRatio || 1;
	    previewCanvas.width = Math.round(DEVICE_W * dpr);
	    previewCanvas.height = Math.round(DEVICE_H * dpr);
	    if (previewFrame) previewFrame.style.setProperty('--preview-scale', String(scale));

	    const ctx = previewCanvas.getContext('2d');
	    if (!ctx) return;
	    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	    ctx.clearRect(0, 0, DEVICE_W, DEVICE_H);

	    // Clip to round screen (keep outside transparent to avoid a square "bezel")
	    ctx.save();
	    ctx.beginPath();
	    ctx.arc(CIRCLE_CX, CIRCLE_CY, CIRCLE_R, 0, Math.PI * 2);
	    ctx.closePath();
	    ctx.clip();

	    // Screen background
	    ctx.fillStyle = '#000000';
	    ctx.fillRect(0, 0, DEVICE_W, DEVICE_H);

		    // No vignette/gradient: keep solid black background.

		    // Text is rendered via HTML overlay (closer to LVGL alignment and enables desc scrolling).
		    const { capped: ititleCapped, title: cappedItitle } = enforceCurrentTitleCap(ctx);
		    const ititle = cappedItitle || (model.titles[currentIndex] || '');

		    // Description (render as provided; line breaks are meaningful)
		    const descRaw = getDescTextForPreview().replace(/\r\n?/g, '\n').trimEnd();
		    const descLinesAll = descRaw ? descRaw.split('\n') : [''];
		    const lineHeight = DESC_LINE_HEIGHT;
	    ctx.font = FONT_DESC;

	    const maxVisibleLines = Math.max(1, Math.floor((DESC_SAFE_BOTTOM_Y - DESC_SAFE_TOP_Y) / lineHeight));
	    const clippedByCount = descLinesAll.length > maxVisibleLines;

	    // LVGL-style scroll container preview:
	    // - header/title are fixed
	    // - description is in a scroll container (scrollbar only when Allow overflow is enabled)
		    if (previewScrollWrap) previewScrollWrap.classList.toggle('hidden', true);
		    if (deviceOverlay) deviceOverlay.classList.toggle('hidden', false);
		    if (deviceOverlayITitle) deviceOverlayITitle.textContent = ititle || '—';
		    if (deviceOverlayITitle) deviceOverlayITitle.style.color = ititleCapped ? '#ef4444' : '';
		    if (deviceOverlayDesc) deviceOverlayDesc.textContent = descRaw || '';
			    if (deviceOverlayDescCont) deviceOverlayDescCont.style.overflowY = 'auto';
			    const overlayKey = `1::${currentIndex}::${descRaw}`;
	    if (deviceOverlayDescCont && overlayKey !== lastOverlayKey) deviceOverlayDescCont.scrollTop = 0;
	    lastOverlayKey = overlayKey;

		    const notes = [];
		    if (allowOverflow && clippedByCount) notes.push(tr('previewOverflowScroll'));
			    setPreviewHint(
			      notes.length ? notes.join(' · ') : formatPreviewLineCount(descLinesAll.length),
			      notes.length ? 'danger' : ''
			    );

	    ctx.restore();

	    // Border ring
	    ctx.save();
	    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
	    ctx.lineWidth = 2;
	    ctx.beginPath();
	    ctx.arc(CIRCLE_CX, CIRCLE_CY, CIRCLE_R - 1, 0, Math.PI * 2);
	    ctx.stroke();
	    ctx.restore();
		  }

  function scheduleDevicePreview() {
    if (!previewCanvas) return;
    clearTimeout(devicePreviewTimer);
    devicePreviewTimer = setTimeout(() => {
      try { renderDevicePreview(); } catch { /* ignore */ }
    }, 60);
  }

  function suggestLineBreaks() {
    if (!fontsLoaded) {
      ensureFontsLoaded().then(() => { scheduleDevicePreview(); suggestLineBreaks(); });
      return;
    }
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    const lineHeight = DESC_LINE_HEIGHT;
    const reservedTop = DESC_SAFE_TOP_Y;
    const reservedBottom = DESC_SAFE_BOTTOM_Y;
    const marginPx = getBorderClearancePx();
    const maxLines = Math.max(1, Math.floor((reservedBottom - reservedTop) / lineHeight));

    const sourceText = model.descsSource[currentIndex] ?? descEl.value;
	    const { lines, overflow, remainingTokens } = wrapTextForRound(ctx, sourceText, {
	      font: FONT_DESC,
	      lineHeight,
	      centerY: LV_DESC_CENTER_Y,
	      yMin: reservedTop,
	      yMax: reservedBottom,
	      marginPx,
	      maxLines,
	      lang: getEditorLang(),
	    });

	    if (!overflow) {
	      setDescValueProgrammatically(lines.join('\n'));
	    } else {
	      if (allowOverflow) {
	        const extraLines = wrapTokensSimple(ctx, remainingTokens, FONT_DESC, DEVICE_W - 2 * marginPx, getEditorLang());
	        const allLines = [...lines, ...extraLines];
	        setDescValueProgrammatically(allLines.join('\n'));
	      } else {
	        // Keep the full text in descsSource, but write only the fitted lines to the device field
	        // so the on-device label doesn't clip mid-word/line.
	        setDescValueProgrammatically(lines.join('\n'));
	        setPreviewHint(tr('previewOverflowSourceKept'), 'danger');
	      }
	    }
    schedulePreviewUsage();
    scheduleDevicePreview();
  }

  function clearLineBreaks() {
    const sourceText = model.descsSource[currentIndex];
    if (typeof sourceText === 'string' && sourceText.length) {
      setDescValueProgrammatically(sourceText);
    } else {
      setDescValueProgrammatically(
        String(descEl.value || '')
          .replace(/\r\n?/g, '\n')
          .replace(/\n+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      );
    }
    schedulePreviewUsage();
    scheduleDevicePreview();
  }

				  if (previewScroll) previewScroll.addEventListener('input', scheduleDevicePreview);
				  if (languageEl) languageEl.addEventListener('change', () => {
				    editorLang = getEditorLang();
				    try { localStorage.setItem('uiLang', editorLang); } catch {}
				    try { localStorage.setItem('editorLang', editorLang); } catch {}
				    applyUiLang();
				    scheduleDevicePreview();
				  });
	  if (allowOverflowEl) allowOverflowEl.addEventListener('change', (e) => {
	    allowOverflow = e.target.checked;
	    try { localStorage.setItem('allowOverflow', String(allowOverflow)); } catch {}
	    scheduleDevicePreview();
	    schedulePreviewUsage();
	  });
	  if (hyphenAggression) hyphenAggression.addEventListener('input', () => { updateHyphenAggressionUI(); scheduleDevicePreview(); });
	  if (btnSuggestBreaks) btnSuggestBreaks.addEventListener('click', suggestLineBreaks);
	  if (btnClearBreaks) btnClearBreaks.addEventListener('click', clearLineBreaks);
	  if (descEl) descEl.addEventListener('input', updateDescSourceFromEditor);

  // Init hyphenation aggression
  (function initHyphenAggression() {
    if (!hyphenAggression) return;
    const saved = parseInt(localStorage.getItem('hyphenAggression') || '', 10);
    if (Number.isFinite(saved)) hyphenAggression.value = String(clamp(saved, 0, 100));
    updateHyphenAggressionUI();
  })();

	  // Init allow overflow
	  (function initAllowOverflow() {
	    if (!allowOverflowEl) return;
	    const saved = localStorage.getItem('allowOverflow');
	    if (saved !== null) {
	      allowOverflowEl.checked = saved === 'true';
	    } else {
	      allowOverflowEl.checked = true;
	    }
	    allowOverflow = allowOverflowEl.checked;
	  })();

			  // Init language (UI + word breaking)
				  (function initEditorLang() {
				    if (!languageEl) return;
				    const saved = normalizeLang(localStorage.getItem('uiLang') || localStorage.getItem('editorLang'));
				    if (saved) languageEl.value = saved;
				    editorLang = getEditorLang();
				    languageEl.value = editorLang;
				    applyUiLang();
				  })();


		  ensureFontsLoaded().then(() => scheduleDevicePreview());
		  window.addEventListener('resize', scheduleDevicePreview);

	  // Recompute preview on edits
	  if (iSEl) iSEl.addEventListener('input', schedulePreviewUsage);
  titleEl.addEventListener('input', () => {
    try {
      const ctx = previewCanvas?.getContext('2d');
      if (ctx) enforceCurrentTitleCap(ctx);
    } catch { /* ignore */ }
    schedulePreviewUsage();
    scheduleDevicePreview();
  });
  descEl.addEventListener('input', schedulePreviewUsage);
  descEl.addEventListener('input', scheduleDevicePreview);

  // BLE intentions uploader (based on smartrosary-web-installer)
  const SERVICE_UUID       = '12345678-1234-5678-1234-56789abcdef0';
  const INTENTS_CHAR_UUID  = '12345678-1234-5678-1234-56789abcde10';
  const STATUS_CHAR_UUID   = '12345678-1234-5678-1234-56789abcdef2';
  const INFO_CTRL_UUID     = 'b8a7a0e2-1a5d-4c1e-9d93-2c9e2b9e10ff';
  const INFO_INTENTIONS_UUID    = 'b8a7a0e2-1a5d-4c1e-9d93-2c9e2b9e1010';
  const INFO_INTENT_ENTRY_UUID  = 'b8a7a0e2-1a5d-4c1e-9d93-2c9e2b9e1011';

  bleDevice = null;
		  bleIntentsChar = null;
		  bleInfoCtrlChar = null;
bleInfoIntentionsChar = null;
		  bleInfoIntentEntryChar = null;
		  bleStatusChar = null;
		  bleReady = true;

	  function isBleConnectedForUpload() {
	    return !!(bleDevice?.gatt?.connected && bleIntentsChar);
	  }

		  function isBleConnectedForDownload() {
		    return !!(bleDevice?.gatt?.connected && bleInfoIntentionsChar && bleInfoIntentEntryChar);
		  }

		  function isBleConnectedForPrefs() {
		    return !!(bleDevice?.gatt?.connected && bleInfoCtrlChar && bleStatusChar);
		  }

			  function updateBleButtonsEnabled() {
			    const connected = !!(bleDevice?.gatt?.connected);
			    if (btnBleUpload) btnBleUpload.disabled = !isBleConnectedForUpload();
			    if (btnBleRefresh) btnBleRefresh.disabled = !isBleConnectedForDownload();
			    if (btnBleConnect) btnBleConnect.disabled = connected;
			    if (btnBleDisconnect) btnBleDisconnect.disabled = !connected;
			    updateSchedulerControls();
			    const shouldMute = !connected || globalProgressActive;
			    if (intentionsCardEl) intentionsCardEl.classList.toggle('muted-card', shouldMute);
			    if (overviewCardEl) overviewCardEl.classList.toggle('muted-card', shouldMute);
			    if (entriesCardEl) entriesCardEl.classList.toggle('muted-card', shouldMute);
			    if (editorCardEl) editorCardEl.classList.toggle('muted-card', shouldMute);
			  }

		  function resetBleConnectionState() {
		    bleIntentsChar = null;
		    bleInfoCtrlChar = null;
		    bleInfoIntentionsChar = null;
		    bleInfoIntentEntryChar = null;
		    bleStatusChar = null;
		    bleReady = true;
		    overviewDeviceName = null;
		    overviewFirmware = null;
		    renderOverviewPills();
		    updateBleButtonsEnabled();
		  }

  async function helloAndAwaitConsent(svc) {
    const ctrlChar = await svc.getCharacteristic(INFO_CTRL_UUID);
    const statChar = await svc.getCharacteristic(STATUS_CHAR_UUID);
    await statChar.startNotifications();

    const allowed = await new Promise(async (resolve) => {
      const onStatus = (ev) => {
        const v = new Uint8Array(ev.target.value.buffer)[0];
        if (v === 0xA1 || v === 0xA0) {
          statChar.removeEventListener('characteristicvaluechanged', onStatus);
          resolve(v === 0xA1);
        }
      };
      statChar.addEventListener('characteristicvaluechanged', onStatus);
      await ctrlChar.writeValue(Uint8Array.of(0x41));
      setTimeout(() => {
        try { statChar.removeEventListener('characteristicvaluechanged', onStatus); } catch {}
        resolve(false);
      }, 25000);
    });

    return allowed;
  }

		  async function connectBLEForIntentions() {
	    if (!navigator.bluetooth) {
	      throw new Error('Web Bluetooth is not available in this browser.');
	    }

	    setStatusKey('statusConnecting', '');
	    setGlobalProgress(5);
		    try {
		      bleDevice = await navigator.bluetooth.requestDevice({
		        filters: [{ services: [SERVICE_UUID] }],
		        optionalServices: [SERVICE_UUID, 'device_information'],
		      });
	    } catch (e) {
	      bleDevice = await navigator.bluetooth.requestDevice({
	        acceptAllDevices: true,
	        optionalServices: [SERVICE_UUID, 'device_information'],
	      });
		      if (!bleDevice.name || !bleDevice.name.toLowerCase().startsWith('rosary')) {
		        throw new Error('Picked device is not a rosary (name check failed).');
		      }
		    }

	    try { bleDevice.removeEventListener('gattserverdisconnected', resetBleConnectionState); } catch {}
	    bleDevice.addEventListener('gattserverdisconnected', () => {
	      resetBleConnectionState();
	      setStatusKey('statusDisconnected', 'danger');
	    });

	    const gatt = await bleDevice.gatt.connect();
	    const svc = await gatt.getPrimaryService(SERVICE_UUID);

	    const consent = await helloAndAwaitConsent(svc);
	    if (!consent) {
      try {
        const ctrl = await svc.getCharacteristic(INFO_CTRL_UUID);
        await ctrl.writeValue(Uint8Array.of(0x42));
      } catch {}
      throw new Error('Device denied consent or timed out. Please tap "Allow" on the device and try again.');
    }

	    bleIntentsChar = await svc.getCharacteristic(INTENTS_CHAR_UUID);
	    bleInfoCtrlChar = await svc.getCharacteristic(INFO_CTRL_UUID);
	    bleInfoIntentionsChar = await svc.getCharacteristic(INFO_INTENTIONS_UUID);
	    bleInfoIntentEntryChar = await svc.getCharacteristic(INFO_INTENT_ENTRY_UUID);
	    try {
	      bleStatusChar = await svc.getCharacteristic(STATUS_CHAR_UUID);
	      bleStatusChar.addEventListener('characteristicvaluechanged', () => { bleReady = true; });
	      await bleStatusChar.startNotifications();
	    } catch {
	      /* optional */
	    }

		    setStatusKey('statusConnected', 'ok');
		    updateBleButtonsEnabled();
		    try {
		      overviewDeviceName = bleDevice?.name ? String(bleDevice.name) : null;
		      overviewFirmware = null;
		      renderOverviewPills();
		      readDeviceInformation()
		        .then(({ deviceName, firmware }) => {
		          if (deviceName) overviewDeviceName = deviceName;
		          if (firmware) {
		            overviewFirmware = firmware;
		            scheduleFwUpdateCheck(firmware);
		          }
		          renderOverviewPills();
		        })
		        .catch(() => {});
		    } catch {}
		    try { await syncDeviceDateTime(); } catch (e) { console.warn('Failed to sync device datetime:', e); }
		    setGlobalProgress(null);
		  }

  async function bleWaitReady() {
    while (!bleReady) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 50));
    }
    bleReady = false;
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (const b of buf) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        const mask = -(crc & 1);
        crc = (crc >>> 1) ^ (0xEDB88320 & mask);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

	  const OP_SET_PREF = 0x50;
	  const TYPE_BOOL = 0x01;
	  const TYPE_U8 = 0x11;
	  const TYPE_U32 = 0x14;

	  function u8(val) {
	    const v = Number(val) & 0xff;
	    return new Uint8Array([v]);
	  }

	  function le32(n) {
	    const a = new Uint8Array(4);
	    const v = Number(n) >>> 0;
	    a[0] = v & 0xff;
	    a[1] = (v >> 8) & 0xff;
	    a[2] = (v >> 16) & 0xff;
	    a[3] = (v >> 24) & 0xff;
	    return a;
	  }

	  function packKV(op, type, key, valBytes) {
	    const k = new TextEncoder().encode(String(key || ''));
	    const v = valBytes instanceof Uint8Array ? valBytes : new Uint8Array(valBytes || []);
	    const out = new Uint8Array(1 + 1 + 1 + k.length + v.length);
	    out[0] = op & 0xff;
	    out[1] = type & 0xff;
	    out[2] = k.length & 0xff;
	    out.set(k, 3);
	    out.set(v, 3 + k.length);
	    return out;
	  }

	  function pad2(n) {
	    return String(n | 0).padStart(2, '0');
	  }

		  async function bleWritePref(key, type, valueBytes) {
		    if (!isBleConnectedForPrefs()) throw new Error('Not connected.');
		    const payload = packKV(OP_SET_PREF, type, key, valueBytes);
		    bleReady = false;
		    await bleInfoCtrlChar.writeValue(payload);
		    await bleWaitReady();
		  }

		  async function syncDeviceDateTime() {
		    // Keep in sync with smartrosary-dashboard: set device time on connect.
		    // Best-effort: ignore failures (older firmware may not support this key).
		    if (!isBleConnectedForPrefs()) return;
		    const epochSeconds = Math.floor(Date.now() / 1000) >>> 0;
		    await bleWritePref('time', TYPE_U32, le32(epochSeconds));
		  }

		  async function sendNVSOverBle(data, filename) {
		    const name = new TextEncoder().encode(filename);
		    await bleIntentsChar.writeValue(name);
		    await bleWaitReady();

	    let offset = 0;
	    const chunkSize = 320;
	    while (offset < data.length) {
      const len = Math.min(chunkSize, data.length - offset);
      const chunk = data.slice(offset, offset + len);
      const c = crc32(chunk);
	      const packet = new Uint8Array(len + 4);
	      packet.set(chunk);
	      new DataView(packet.buffer).setUint32(len, c, true);
	      await bleIntentsChar.writeValue(packet);
	      await bleWaitReady();
	      offset += len;
	      const pct = Math.min(100, Math.round((offset / data.length) * 100));
	      setStatusKey('statusBleUploadProgress', '', { pct });
	      setGlobalProgress(pct);
	    }
	  }

	  function decodeBleText(value) {
	    const u8 = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	    return new TextDecoder().decode(u8);
	  }

	  function parseBleJson(text) {
	    const trimmed = String(text || '').trim().replace(/\0+$/g, '');
	    return JSON.parse(trimmed || '{}');
	  }

		  async function downloadIntentionsModelOverBle() {
		    if (!bleInfoIntentionsChar || !bleInfoIntentEntryChar) throw new Error('__ERR_NOT_CONNECTED__');

	    const summaryText = decodeBleText(await bleInfoIntentionsChar.readValue());
	    const summary = parseBleJson(summaryText);
		    if (summary?.requireConsent) throw new Error('__ERR_DEVICE_CONSENT__');

	    const count = Math.max(0, Math.min(SCHED_MAX_SLOTS, parseInt(summary?.count ?? 0, 10) || 0));
	    const titles = [];
	    const descs = [];
	    const schedStarts = [];
	    const schedSets = [];
	    const schedParts = [];
	    const schedAuto = !!summary?.auto;

	    for (let idx = 0; idx < count; idx++) {
	      setGlobalProgress(Math.round((idx / Math.max(1, count)) * 100));
	      let fullDesc = '';
	      let currentOffset = 0;
	      // eslint-disable-next-line no-constant-condition
	      while (true) {
	        bleReady = false;
	        await bleInfoIntentEntryChar.writeValue(Uint8Array.of(idx & 0xFF, (idx >> 8) & 0xFF, currentOffset & 0xFF, (currentOffset >> 8) & 0xFF));
	        await bleWaitReady();

	        const deadline = Date.now() + 1500;
	        // Poll until the cached entry matches requested index and offset.
	        // eslint-disable-next-line no-constant-condition
	        while (true) {
	          const entryText = decodeBleText(await bleInfoIntentEntryChar.readValue());
	          const entry = parseBleJson(entryText);
	          if (entry?.requireConsent) throw new Error('Device requires consent. Tap "Allow" on the device, then try again.');
	          
	          // Firmware will return desc_offset if it supports chunking, or undefined if legacy.
	          const returnedOffset = entry?.desc_offset | 0;
	          if (entry?.present && (entry?.index | 0) === idx && returnedOffset === currentOffset) {
	            const chunk = String(entry.desc ?? '');
	            fullDesc += chunk;
	            currentOffset += new TextEncoder().encode(chunk).length;
	            
	            const total = entry.desc_total || 0;
	            if (!total || currentOffset >= total || chunk.length === 0) {
	              titles.push(String(entry.title ?? ''));
	              descs.push(fullDesc);
	              schedStarts.push(Number(entry.start) || 0);
	              schedSets.push(Number(entry.set) || 0);
	              schedParts.push(Number(entry.part) || 0);
	              break; // Finished this intention
	            } else {
	              break; // Need next chunk, break inner loop to write next offset
	            }
	          }
	          if (Date.now() > deadline) throw new Error(`Timed out waiting for entry ${idx} at offset ${currentOffset}.`);
	          // eslint-disable-next-line no-await-in-loop
	          await new Promise((r) => setTimeout(r, 30));
	        }
	        
	        if (descs.length > idx) break; // If we fully pushed this intention, break outer loop
	      }
	    }
	    setGlobalProgress(100);

	    const iS = titles.join('\n');
	    return { numIntentions: count, iS, titles, descs, schedAuto, schedStarts, schedSets, schedParts };
	  }

	  function downloadBlob(u8, filename) {
	    const blob = new Blob([u8], { type: 'application/octet-stream' });
	    const a = document.createElement('a');
	    a.href = URL.createObjectURL(blob);
	    a.download = filename;
	    document.body.appendChild(a);
	    a.click();
	    a.remove();
	  }

	  function exportIntentionsJson() {
	    updateFromDetailPanel();
	    const exported = getModelForExport();
	    return {
	      numIntentions: exported.numIntentions | 0,
	      iS: String(exported.iS || ''),
	      titles: (exported.titles || []).slice(0, exported.numIntentions).map((v) => String(v ?? '')),
	      descs: (exported.descs || []).slice(0, exported.numIntentions).map((v) => String(v ?? '')),
	      scheduler: {
	        auto: !!model.schedAuto,
	        starts: (model.schedStarts || []).slice(0, Math.min(exported.numIntentions, SCHED_MAX_SLOTS)).map((v) => Number(v) || 0),
	        sets: (model.schedSets || []).slice(0, Math.min(exported.numIntentions, SCHED_MAX_SLOTS)).map((v) => Number(v) || 0),
	        parts: (model.schedParts || []).slice(0, Math.min(exported.numIntentions, SCHED_MAX_SLOTS)).map((v) => Number(v) || 0),
	      },
	    };
	  }

		  async function startBleIntentionsUpload() {
		    updateFromDetailPanel();
		    try {
		      if (!isBleConnectedForUpload()) throw new Error('__ERR_CONNECT_FIRST__');
		      const bin = NVS.buildIntentionsBin(getModelForExport());
			      if (bin.length !== 20480) {
			        throw new Error(`Generated partition has size ${bin.length}, expected 20480.`);
			      }
		      setStatusKey('statusBleUploadStart', '');
	      setGlobalProgress(0);
	      await sendNVSOverBle(bin, 'nvs-intentions.bin');
	      setStatusKey('statusBleUploadDone', 'ok');
	      setGlobalProgress(null);
		    } catch (e) {
		      console.error(e);
		      setStatusFromError(e, 'statusBleUploadFailed');
		      setGlobalProgress(null);
		    }
		  }

		  async function startBleIntentionsDownload() {
		    try {
		      if (!isBleConnectedForDownload()) throw new Error('__ERR_CONNECT_FIRST__');
		      setStatusKey('statusBleDownloadStart', '');
	      setGlobalProgress(0);
	      const downloaded = await downloadIntentionsModelOverBle();

	      model.numIntentions = clamp(downloaded.numIntentions | 0, 0, 64);
	      model.iS = String(downloaded.iS || '');
	      model.titles = (downloaded.titles || []).slice();
	      model.descs = (downloaded.descs || []).slice();
	      model.descsSource = (downloaded.descs || []).slice();
	      model.schedAuto = !!downloaded.schedAuto;
	      model.schedStarts = (downloaded.schedStarts || []).slice();
	      model.schedSets = (downloaded.schedSets || []).slice();
	      model.schedParts = (downloaded.schedParts || []).slice();
	      resizeArrays(model.numIntentions);
	      currentIndex = 0;
	      updateUIFromModel();
	      clearSchedulerDirty();
	      setStatusKey('statusBleDownloadDone', 'ok', { count: model.numIntentions });
	      setGlobalProgress(null);
		    } catch (e) {
		      console.error(e);
		      setStatusFromError(e, 'statusBleDownloadFailed');
		      setGlobalProgress(null);
		    }
		  }

		  async function startBleSchedulerSave() {
		    try {
		      if (!isBleConnectedForPrefs()) { setStatusKey('notConnected', 'danger'); return; }
		      const count = Math.min(model.numIntentions | 0, SCHED_MAX_SLOTS);
	      const totalSteps = count * 3 + 2;
	      let done = 0;
	      setGlobalProgress(0);

	      const bump = () => {
	        done++;
	        const pct = totalSteps ? Math.round((done / totalSteps) * 100) : 100;
	        setGlobalProgress(pct);
	      };

	      for (let i = 0; i < count; i++) {
	        await bleWritePref(`i${pad2(i)}s`, TYPE_U32, le32(Number(model.schedStarts[i]) >>> 0));
	        bump();
	        await bleWritePref(`i${pad2(i)}m`, TYPE_U8, u8(model.schedSets[i]));
	        bump();
	        await bleWritePref(`i${pad2(i)}p`, TYPE_U8, u8(model.schedParts[i]));
	        bump();
	      }
	      await bleWritePref('i-cnt', TYPE_U8, u8(count));
	      bump();
	      await bleWritePref('i-auto', TYPE_BOOL, u8(model.schedAuto ? 1 : 0));
	      bump();

	      clearSchedulerDirty();
	      setStatusKey('statusSchedSaved', 'ok');
	      setGlobalProgress(null);
	    } catch (e) {
	      console.error(e);
	      setStatusKey('statusSchedSaveFailed', 'danger');
	      setGlobalProgress(null);
	    }
	  }

		  async function startBleIntentionsErasePartition() {
		    try {
		      if (!isBleConnectedForUpload()) { setStatusKey('notConnected', 'danger'); return; }
		      const ok = globalThis.confirm ? globalThis.confirm(tr('intentionsErase') + '?') : true;
	      if (!ok) return;

	      setStatusKey('statusEraseStart', '');
	      setGlobalProgress(0);
	      const empty = NVS.buildIntentionsBin({ numIntentions: 0, iS: '', titles: [], descs: [] });
	      await sendNVSOverBle(empty, 'nvs-intentions.bin');
	      setStatusKey('statusEraseDone', 'ok');
	      setGlobalProgress(null);
	      try { await startBleIntentionsDownload(); } catch {}
	    } catch (e) {
	      console.error(e);
	      setStatusKey('statusEraseFailed', 'danger');
	      setGlobalProgress(null);
	    }
	  }

		  if (btnBleUpload) {
		    btnBleUpload.addEventListener('click', () => {
		      startBleIntentionsUpload();
		    });
		  }
		  if (btnBleConnect) {
		    btnBleConnect.addEventListener('click', async () => {
		      try {
		        if (bleDevice?.gatt?.connected) {
		          setStatusKey('statusConnected', 'ok');
		          return;
		        }
		        resetBleConnectionState();
		        await connectBLEForIntentions();
		        await startBleIntentionsDownload();
			      } catch (e) {
			        console.error(e);
			        setStatusFromError(e, 'statusBleConnectFailed');
			      }
			    });
			  }

		  if (btnBleRefresh) {
		    btnBleRefresh.addEventListener('click', async () => {
		      try {
		        await startBleIntentionsDownload();
		      } catch (e) {
		        console.error(e);
		      }
		    });
		  }

		  if (btnBleDisconnect) {
		    btnBleDisconnect.addEventListener('click', () => {
		      try {
		        if (!bleDevice?.gatt?.connected) {
		          resetBleConnectionState();
		          setStatusKey('notConnected', '');
		          return;
		        }
		        setStatusKey('statusDisconnecting', '');
		        bleDevice.gatt.disconnect();
		        // gattserverdisconnected handler will finalize UI state.
			      } catch (e) {
			        console.error(e);
			        setStatusFromError(e, 'statusBleDisconnectFailed');
			      }
			    });
			  }

		  resetBleConnectionState();

	  if (btnSaveJson) {
	    btnSaveJson.addEventListener('click', () => {
	      try {
	        const json = JSON.stringify(exportIntentionsJson(), null, 2);
	        downloadBlob(new TextEncoder().encode(json), 'intentions.json');
	        setStatusKey('statusSavedJson', 'ok');
	      } catch (e) {
	        console.error(e);
	        setStatusKey('statusSaveJsonFailed', 'danger');
	      }
	    });
	  }
	  let fwUpdateState = null;
	  let fwLastDeviceVersion = null;
	  let fwPendingDeviceVersion = null;
	  let fwCheckInFlight = false;

	  function renderFwUpdateBanner() {
	    const banner = document.getElementById('fwUpdateBanner');
	    if (!banner) return;
	    if (!fwUpdateState) {
	      banner.hidden = true;
	      return;
	    }

	    const textEl = document.getElementById('fwUpdateText');
	    const linkEl = document.getElementById('fwUpdateLink');
	    const current = fwUpdateState.currentVersion;
	    const latest = fwUpdateState.latestVersion;

	    const msg = typeof tr('fwUpdateAvailable') === 'function'
	      ? tr('fwUpdateAvailable')({ current, latest })
	      : (tr('fwUpdateAvailable') || `Firmware update available: ${current} → ${latest}`);

	    if (textEl) textEl.textContent = msg;
	    if (linkEl) {
	      linkEl.href = fwUpdateState.installerUrl;
	      linkEl.textContent = tr('fwUpdateOpenInstaller') || 'Update';
	      linkEl.title = tr('fwUpdateOpenInstaller') || 'Update';
	    }
	    banner.hidden = false;
	  }

	  function setFwUpdateBanner({ currentVersion, latestVersion, installerUrl }) {
	    fwUpdateState = { currentVersion, latestVersion, installerUrl };
	    renderFwUpdateBanner();
	  }

	  function clearFwUpdateBanner() {
	    fwUpdateState = null;
	    renderFwUpdateBanner();
	  }

	  async function runFwUpdateCheck(deviceFwVersionRaw) {
	    if (typeof getInstallerUrl !== 'function') return; // firmware-update.js not loaded
	    const installerUrl = getInstallerUrl();
	    const current = normalizeVersionString(deviceFwVersionRaw);
	    if (!current) {
	      try { clearFwUpdateBanner(); } catch {}
	      return;
	    }

	    try {
	      const { version: latest } = await getLatestFirmwareVersion();
	      if (latest && isUpdateAvailable(current, latest)) {
	        setFwUpdateBanner({ currentVersion: current, latestVersion: latest, installerUrl });
	      } else {
	        clearFwUpdateBanner();
	      }
	    } catch (err) {
	      console.warn('[fw] update check failed', err?.message || err);
	    }
	  }

	  window.scheduleFwUpdateCheck = function scheduleFwUpdateCheck(deviceFwVersionRaw) {
	    if (typeof normalizeVersionString !== 'function') return;
	    const current = normalizeVersionString(deviceFwVersionRaw);
	    if (!current) {
	      fwLastDeviceVersion = null;
	      fwPendingDeviceVersion = null;
	      try { clearFwUpdateBanner(); } catch {}
	      return;
	    }
	    if (current === fwLastDeviceVersion) return;
	    fwLastDeviceVersion = current;

	    if (fwCheckInFlight) {
	      fwPendingDeviceVersion = current;
	      return;
	    }

	    fwCheckInFlight = true;
	    (async () => {
	      let next = current;
	      try {
	        while (next) {
	          fwPendingDeviceVersion = null;
	          await runFwUpdateCheck(next);
	          next = fwPendingDeviceVersion;
	        }
	      } finally {
	        fwCheckInFlight = false;
	      }
	    })();
	  }

		})();
