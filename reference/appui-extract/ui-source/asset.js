const asset = {
  tabbar: {
    piano: {
      name: 'piano',
      nameJa: 'ピアノ',
      nameZh: '钢琴',
    },
    sounds: {
      name: 'sounds',
      nameJa: 'サウンド',
      nameZh: '音色',
    },
    music: {
      name: 'music',
      nameJa: 'ミュージック',
      nameZh: '音乐',
    },
  },
  contentsbar: {
    notSaved: {
      name: '(Not saved sound)',
      nameJa: '(保存されていない音色)',
      nameZh: '(未保存的音色)',
    }
  },
  pianoSelection: {
    skexl: {
      name: 'SK-EX Competition Grand',
      nameJa: 'SK-EX コンクールグランド',
      nameZh: 'SK-EX 竞赛三角钢琴',
      img: '../img/SK-EX-L.png',
      img_hr: '../img/SK-EX-L_hr.png',
    },
    skex: {
      name: 'SK-EX Concert Grand',
      nameJa: 'SK-EX コンサートグランド',
      nameZh: 'SK-EX 音乐会三角钢琴',
      img: '../img/SK-EX.png',
      img_hr: '../img/SK-EX_hr.png',
    },
    ex: {
      name: 'EX Concert Grand',
      nameJa: 'EX コンサートグランド',
      nameZh: 'EX 音乐会三角钢琴',
      img: '../img/EX.png',
      img_hr: '../img/EX_hr.png',
    },
    sk5: {
      name: 'SK-5 Grand Piano',
      nameJa: 'SK-5 グランドピアノ',
      nameZh: 'SK-5 三角钢琴',
      img: '../img/SK5.png',
      img_hr: '../img/SK5_hr.png',
    },
    up: {
      name: 'Upright Piano',
      nameJa: 'アップライトピアノ',
      nameZh: '立式钢琴',
      img: '../img/K.png',
      img_hr: '../img/K_hr.png',
    },
  },
  soundsCategory: {
    all: {
      name: 'All Sounds',
      nameJa: '全音色',
      nameZh: '所有音色',
      class: 'sounds__card-0',
    },
    user: {
      name: 'User',
      nameJa: 'ユーザー',
      nameZh: '用户',
      class: 'sounds__card-1',
    },
    favorite: {
      name: 'Favorite',
      nameJa: 'お気に入り',
      nameZh: '收藏夹',
      class: 'sounds__card-2',
    },
    recently: {
      name: 'Recently Played',
      nameJa: '最近演奏した音色',
      nameZh: '历史演奏记录',
      class: 'sounds__card-3',
    },
    styleCollection: {
      name: 'Piano Style Collection',
      nameJa: 'ピアノスタイルコレクション',
      nameZh: 'Piano Style Collection',
      class: 'sounds__card-8',
    },
    reccomended: {
      name: 'Recommended',
      nameJa: 'おすすめ音色',
      nameZh: '推荐音色',
      class: 'sounds__card-4',
    },
    classic: {
      name: 'Classic',
      nameJa: 'クラシック',
      nameZh: '古典',
      class: 'sounds__card-5',
    },
    jazz: {
      name: 'Jazz',
      nameJa: 'ジャズ',
      nameZh: '爵士',
      class: 'sounds__card-6'
    },
    pop: {
      name: 'Pop',
      nameJa: 'ポップ',
      nameZh: '流行',
      class: 'sounds__card-7',
    },
    ensemble: {
      name: 'Ensemble',
      nameJa: 'アンサンブル',
      nameZh: '合奏',
      class: 'sounds__card-9',
    },
    histrical: {
      name: 'Historical',
      nameJa: 'ヒストリカル',
      nameZh: 'Historical',
      class: 'sounds__card-10',
    },
    relax: {
      name: 'Relax',
      nameJa: 'リラックス',
      nameZh: 'Relax',
      class: 'sounds__card-11',
    },
    holiday: {
      name: 'Holiday',
      nameJa: 'ホリデー',
      nameZh: 'Holiday',
      class: 'sounds__card-12',
    },
    party: {
      name: 'Party',
      nameJa: 'パーティ',
      nameZh: 'Party',
      class: 'sounds__card-13',
    },
    chillout: {
      name: 'Chillout',
      nameJa: 'チルアウト',
      nameZh: 'Chillout',
      class: 'sounds__card-14',
    },
  },
  timbreCategory: {
    piano: {
      name: 'Piano',
      nameJa: 'ピアノ',
      nameZh: '钢琴',
      icon: 'KIF-piano',
    },
    ep: {
      name: 'Electric Piano',
      nameJa: 'エレクトリックピアノ',
      nameZh: '电钢琴',
      icon: 'KIF-electric-piano',
    },
    org: {
      name: 'Organ',
      nameJa: 'オルガン',
      nameZh: '风琴',
      icon: 'KIF-organ',
    },
    churchorg: {
      name: 'Church Organ',
      nameJa: 'チャーチオルガン',
      nameZh: '教堂风琴',
      icon: 'KIF-church-organ',
    },
    harpsi: {
      name: 'Harpsichord',
      nameJa: 'ハープシコード',
      nameZh: '羽管键琴',
      icon: 'KIF-harpsichord',
    },
    mallets: {
      name: 'Mallets',
      nameJa: 'マレット',
      nameZh: '木琴',
      icon: 'KIF-mallets',
    },
    strings: {
      name: 'Strings',
      nameJa: 'ストリングス',
      nameZh: '弦乐',
      icon: 'KIF-strings',
    },
    vocal: {
      name: 'Vocal',
      nameJa: 'ボーカル',
      nameZh: '拟人声效果音',
      icon: 'KIF-choir',
    },
    pad: {
      name: 'Pad',
      nameJa: 'パッド',
      nameZh: '合成器电子音色',
      icon: 'KIF-pad',
    },
    bass: {
      name: 'Bass',
      nameJa: 'ベース',
      nameZh: '贝斯',
      icon: 'KIF-bass',
    },
    guitar: {
      name: 'Guitar',
      nameJa: 'ギター',
      nameZh: '吉他',
      icon: 'KIF-guitar',
    },
    colorful: {
      name: 'Colorful',
      nameJa: 'カラフル',
      nameZh: 'Colorful',
      icon: 'KIF-colorful',
    },
  },
  musicCategory: {
    usb: {
      name: 'USB Music Player',
      nameJa: 'USBメモリプレイヤー',
      nameZh: 'USB记忆卡播放器',
      icon: 'KIF-usb-music',
      bg: '../img/USBMusic.png',
      isWide: true,
      availableModel: [],
      availableDest: []
    },
    hymn: {
      name: 'Hymn Player',
      nameJa: 'ヒムプレイヤー',
      nameZh: 'Hymn Player',
      icon: 'KIF-hymn',
      bg: '../img/Hymn.png',
      isWide: true,
      availableModel: [],
      availableDest: ['US']
    },
    favorite: {
      name: 'Favorite',
      nameJa: 'お気に入り',
      nameZh: '收藏夹',
      icon: 'KIF-music-favorite',
      bg: '../img/Favorite.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },
    recently: {
      name: 'Recently\nPlayed',
      nameJa: `最近\n再生した曲`,
      nameZh: `历史播放记录`,
      icon: 'KIF-recently-played',
      bg: '../img/RecentlyPlayed.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },
    relax: {
      name: 'Relax Songs',
      nameJa: `リラックス\nソング集`,
      nameZh: `Relax Songs`,
      icon: 'KIF-relax',
      bg: '../img/Relax.png',
      isWide: false,
      availableModel: ['CA9900GP', 'SCA901', 'SCA401'],
      availableDest: ['D']
    },
    composer: {
      name: 'Composer',
      nameJa: '作曲家',
      nameZh: '作曲人',
      icon: 'KIF-composer-person',
      bg: '../img/Composer.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },
    lesson: {
      name: 'Lesson\nBooks',
      nameJa: '楽譜集',
      nameZh: '乐谱集',
      icon: 'KIF-lesson-book',
      bg: '../img/LessonBook.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },
    genre: {
      name: 'Genre',
      nameJa: 'ジャンル',
      nameZh: '流派',
      icon: 'KIF-genre',
      bg: '../img/Genre.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },
    sound: {
      name: 'Sound\nDemo',
      nameJa: '音色デモ',
      nameZh: '音色演示',
      icon: 'KIF-music-sound',
      bg: '../img/SoundDemo.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },
    recorder: {
      name: 'Recorder\nPlayback',
      nameJa: '録音した曲',
      nameZh: '录制的曲目',
      icon: 'KIF-recorder',
      bg: '../img/RecorderPlayback.png',
      isWide: false,
      availableModel: [],
      availableDest: []
    },

  },
  player: {
    mode: {
      concertMagic: {
        name: 'Concert Magic',
        nameJa: 'コンサートマジック',
        nameZh: '音乐会魔法'
      },
      player: {
        name: 'Player',
        nameJa: 'プレイヤー',
        nameZh: '音乐播放器'
      },
      lesson: {
        name: 'Lesson',
        nameJa: 'レッスン',
        nameZh: '教程'
      },
      recorder: {
        name: 'Recorder Playback',
        nameJa: '録音した曲',
        nameZh: '录制的曲目'
      },
      usb: {
        name: 'USB Music Player',
        nameJa: 'USBメモリプレイヤー',
        nameZh: 'USB记忆卡播放器'
      },
    },
    lessonParams: {
      tempo: {
        name: 'Tempo',
        nameJa: '再生テンポ',
        nameZh: '播放速度'
      },
      metroVol: {
        name: 'Metronome Volume',
        nameJa: 'メトロノームボリューム',
        nameZh: '节拍器音量'
      },
      balance: {
        name: 'Right/Left Balance',
        nameJa: '右手左手バランス',
        nameZh: '右手左手平衡'
      },
      transpose: {
        name: 'Transpose',
        nameJa: 'トランスポーズ',
        nameZh: '移调'
      },
      abrepeat: {
        name: 'AB Repeat',
        nameJa: 'ABリピート',
        nameZh: 'AB重复'
      },
    },
  },
  rhythmTab: {
    metro: {
      name: 'Metronome',
      nameJa: 'メトロノーム',
      nameZh: '节拍器',
    },
    rhythm: {
      name: 'Rhythm',
      nameJa: 'リズム',
      nameZh: '节奏',
    },
  },
  recorder: {
    status: {
      stop: {
        name: 'Stop',
        nameJa: '録音停止',
        nameZh: '停止录音',
      },
      standby: {
        name: 'Recording standby',
        nameJa: '録音スタンバイ',
        nameZh: '录音待机',
      },
      recording: {
        name: 'Recording',
        nameJa: '録音中',
        nameZh: '录音中',
      },
      complete: {
        name: 'Recording completed',
        nameJa: '録音終了',
        nameZh: '录音结束',
      },
      playback: {
        name: 'Playback',
        nameJa: '再生中',
        nameZh: '播放中',
      },
    },
    action:{
      playback: {
        name: 'PLAYBACK',
        nameJa: '再生',
        nameZh: '播放',
    },
      overdub: {
        name: 'OVERDUB',
        nameJa: 'オーバーダブ',
        nameZh: '多重录音',
    },
      save: {
        name: 'SAVE',
        nameJa: '保存',
        nameZh: '保存',
    },
      delete: {
        name: 'DELETE',
        nameJa: '削除',
        nameZh: '删除',
    },
      share: {
        name: 'SHARE',
        nameJa: '共有',
        nameZh: '共有',
      },
    },
    overdubMsgs: {
      overdubbing: {
        name: 'Overdubbing',
        nameJa: 'オーバーダビング',
        nameZh: '多重录音',
      },
      noSong: {
        name: 'Not selected',
        nameJa: '楽曲未選択',
        nameZh: '未选择乐曲',
      },
      selectReq: {
        name: 'Overdubbing song selection',
        nameJa: '楽曲を選択してください',
        nameZh: '请选择乐曲',
      },
      deselect: {
        name: 'Deselect current overdubbing song',
        nameJa: '現在の選曲を解除する',
        nameZh: '取消目前已选乐曲',
      },
      recorded: {
        name: 'Recorded song',
        nameJa: '録音した楽曲',
        nameZh: '已录乐曲',
      },
    },
    menu: {
      format: {
        name: 'Format',
        nameJa: '録音フォーマット',
        nameZh: '录音格式化',
      },
      gain: {
        name: 'Gain',
        nameJa: '録音レベル',
        nameZh: '录音级别',
      },
      cancel: {
        name: 'Cancel standby',
        nameJa: 'スタンバイキャンセル',
        nameZh: '待机取消',
      },
    },
    mode: {
      internal: {
        name: 'Internal',
        nameJa: '内蔵メモリ',
        nameZh: '内存',
      },
      wav: {
        name: 'Wav',
        nameJa: 'Wav',
        nameZh: 'WAV',
      },
      mp3: {
        name: 'mp3',
        nameJa: 'mp3',
        nameZh: 'MP3',
      },
    },

  },
  editor: {
    pianoVari: {
      name: 'Piano Variation',
      nameJa: 'ピアノバリエーション',
      nameZh: '钢琴变奏曲',
    },
    rendering: {
      name: 'Rendering Type',
      nameJa: 'レンダリングタイプ',
      nameZh: '渲染类型',
    },
    mainTimbre: {
      name: 'Main Sound',
      nameJa: 'メイン音色',
      nameZh: '主音色',
    },
    subTimbre: {
      name: 'Sub Sound',
      nameJa: 'サブ音色',
      nameZh: '次音色',
    },
    vt: {
      name: 'Virtual Technician',
      nameJa: 'コンサートチューナー',
      nameZh: '钢琴声音效果',
    },
    ambience: {
      name: 'Ambience',
      nameJa: 'アンビエンス',
      nameZh: '气氛',
    },
    reverb: {
      name: 'Reverb',
      nameJa: 'リバーブ',
      nameZh: '混响',
    },
    effect: {
      name: 'Effect',
      nameJa: 'エフェクト',
      nameZh: '音效',
    },
    tuning: {
      name: 'Tuning',
      nameJa: 'チューニング',
      nameZh: '调音',
    },
    transpose: {
      name: 'Transpose',
      nameJa: 'トランスポーズ',
      nameZh: '移调',
    },
    otherSetting: {
      name: 'Other sound settings',
      nameJa: 'その他の音色設定',
      nameZh: '其他音色设置',
    },
    balance: {
      name: 'Balance',
      nameJa: 'バランス',
      nameZh: '平衡',
    },
    octaveShift: {
      name: 'Octave Shift',
      nameJa: 'オクターブシフト',
      nameZh: '八度音移行',
    },
    dynamics: {
      name: 'Dynamics',
      nameJa: 'ダイナミクス',
      nameZh: '强弱',
    },
    splitPoint: {
      name: 'Split Point',
      nameJa: 'スプリットポイント',
      nameZh: '分割点',
    },
    lowerPedal: {
      name: 'Lower Pedal',
      nameJa: 'ロワーペダル',
      nameZh: '低音区踏板机能开关',
    },
    depth: {
      name: 'DEPTH',
      nameJa: 'デプス',
      nameZh: '深度',
    },
    time: {
      name: 'TIME',
      nameJa: 'タイム',
      nameZh: '时间',
    },
    dryWet: {
      name: 'Dry / Wet',
      nameJa: 'エフェクトレベル',
      nameZh: 'Dry / Wet',
    },
    speed: {
      name: 'SPEED',
      nameJa: 'スピード',
      nameZh: 'SPEED',
    },
    monoStereo: {
      name: 'MONO/STEREO',
      nameJa: 'モノラル/ステレオ',
      nameZh: 'MONO/STEREO',
    },
    accel: {
      name: 'Accel. Speed',
      nameJa: 'アクセルスピード',
      nameZh: 'Accel. Speed',
    },
    rotary: {
      name: 'Rotary Speed',
      nameJa: 'ロータリースピード',
      nameZh: 'Rotary Speed',
    },
    menu: {
      save: {
        name: 'Save this sound',
        nameJa: '現在の音色を保存する',
        nameZh: '保存目前音色',
        item: 'saveSound'
      },
      openRec: {
        name: 'Open Recorder',
        nameJa: 'レコーダー画面を表示',
        nameZh: '录音画面表示',
        item: 'openRec'
      },
      openMetro: {
        name: 'Open Metronome',
        nameJa: 'メトロノーム画面を表示',
        nameZh: '节拍器画面表示',
        item: 'openMetro'
      },
    },

  },
  virtualTechnician: {
    touchCurve: {
      name: 'Touch Curve',
      nameJa: 'タッチカーブ',
      nameZh: '键盘力度灵敏度',
      icon: 'KIF-touch-curve',
      editor: {
        name: 'Touch Curve Editor',
        nameJa: 'タッチカーブエディタ',
        nameZh: '键盘力度灵敏度编辑器',
      },
      key: {
        name: 'Dynamics',
        nameJa: '打鍵強さ',
        nameZh: '弹奏琴键强度',
      },
      offset: {
        name: 'Velocity',
        nameJa: '音の強さ',
        nameZh: '乐音强度',
      },
      confirmTitle: {
        name: 'Touch Curve Reset',
        nameJa: 'タッチカーブリセット',
        nameZh: '复原键盘力度灵敏度',
      },
      confirmText: {
        name: 'Tap the [OK] button to reset the touch curve to the default (linear) User touch curve.',
        nameJa: '「リセット」ボタンをタップすると現在編集中のタッチカーブデータが全て初期状態に戻ります。',
        nameZh: '点击“复原”后，正在编辑中的键盘力度灵敏度数据将全部恢复为出厂设置。',
      },
    },
    voicing: {
      name: 'Voicing',
      nameJa: 'ボイシング',
      nameZh: '调音质',
      icon: 'KIF-voicing',
      editor: {
        name: 'Voicing Editor',
        nameJa: 'ボイシングエディタ',
        nameZh: '调音质编辑器',
      },
      key: {
        name: 'Key',
        nameJa: 'セレクトキー',
        nameZh: '主音选择',
      },
      offset: {
        name: 'Voicing',
        nameJa: 'ボイシング',
        nameZh: '调音质',
      },
      confirmTitle: {
        name: 'Voicing Reset',
        nameJa: 'ボイシングリセット',
        nameZh: '调音质复原',
      },
      confirmText: {
        name: 'Tap the [OK] button to reset voicing to the default (flat) User voicing setting.\n\nTo reset a single note, select the desired key then double-tap the Offset value.',
        nameJa: '「リセット」ボタンをタップすると現在編集中のボイシングデータが全て初期状態に戻ります。\n単音だけリセットしたい場合は、キーを選択した状態でボイシングの値をダブルタップしてください。',
        nameZh: '点击“复原”后，正在编辑中的调音质数据将全部恢复为初始状态。\n如只需复原平音调时，可在已选择琴键的状态下双击调音质数值即可。',
      },
    },
    resoRendering: {
      name: 'String Resonances',
      nameJa: 'レゾナンスレンダリング',
      nameZh: '止音器共鸣',
      icon: 'KIF-strings-resonance',
    },
    damperReso: {
      name: 'Damper Resonance',
      nameJa: 'ダンパーレゾナンス',
      nameZh: '止音器共鸣',
      icon: 'KIF-damper-resonance',
    },
    damperNoise: {
      name: 'Damper Noise',
      nameJa: 'ダンパーノイズ',
      nameZh: '止音器效果音',
      icon: 'KIF-damper-noise',
    },
    stringReso: {
      name: 'String Resonance',
      nameJa: 'ストリングレゾナンス',
      nameZh: '琴弦共鸣',
      icon: 'KIF-strings-resonance',
    },
    undampedReso: {
      name: 'Undamped\nString Resonance',
      nameJa: '開放弦レゾナンス',
      nameZh: '开放弦共鸣',
      icon: 'KIF-undamped-string-resonance',
    },
    cabinetReso: {
      name: 'Cabinet Resonance',
      nameJa: 'キャビネットレゾナンス',
      nameZh: '外框共鸣',
      icon: 'KIF-cabinet-resonance',
    },
    keyOff: {
      name: 'Key Off Effect',
      nameJa: 'キーオフエフェクト',
      nameZh: '止音时效果音',
      icon: 'KIF-keyoff-effect',
    },
    fallback: {
      name: 'Fallback Noise',
      nameJa: 'キーアクションノイズ',
      nameZh: '击弦机复位效果音',
      icon: 'KIF-fallback-noise',
    },
    hammerNoise: {
      name: 'Hammer Noise',
      nameJa: 'ハンマーノイズ',
      nameZh: '音锤效果音',
      icon: 'KIF-hammer-noise',
    },
    hammerDelay: {
      name: 'Hammer Delay',
      nameJa: 'ハンマーディレイ',
      nameZh: '音锤延迟',
      icon: 'KIF-hammer-delay',
    },
    topboard: {
      name: 'Topboard',
      nameJa: '大屋根開閉',
      nameZh: '顶盖开闭模拟',
      icon: 'KIF-topboard',
    },
    decay: {
      name: 'Decay Time',
      nameJa: 'ディケイタイム',
      nameZh: '消音时间',
      icon: 'KIF-adsr',
    },
    release: {
      name: 'Release Time',
      nameJa: 'リリースタイム',
      nameZh: '释放时间',
      icon: 'KIF-adsr',
    },
    stretchTuning: {
      name: 'Stretch Tuning',
      nameJa: 'ストレッチチューニング',
      nameZh: '拉伸调音',
      icon: 'KIF-stretch-tuning',
      editor: {
        name: 'Stretch Tuning Editor',
        nameJa: 'ストレッチチューニングエディタ',
        nameZh: '拉伸调音编辑器',
      },
      key: {
        name: 'Key',
        nameJa: 'セレクトキー',
        nameZh: '主音选择',
      },
      offset: {
        name: 'Tuning',
        nameJa: 'チューニング',
        nameZh: '调音',
      },
      confirmTitle: {
        name: 'Stretch Tuning Reset',
        nameJa: 'ストレッチチューニングリセット',
        nameZh: '拉伸调音复原',
      },
      confirmText: {
        name: 'Tap the [OK] button to reset tuning to the default (flat) User stretch tuning setting.\n\nTo reset a single note, select the desired key then double-tap the Tuning value.',
        nameJa: '「リセット」ボタンをタップすると現在編集中のストレッチチューニングデータが全て初期状態に戻ります。\n単音だけリセットしたい場合は、キーを選択した状態でチューニングの値をダブルタップしてください。',
        nameZh: '点击“复原”后，正在编辑中的拉伸调音数据将全部恢复为初始状态。\n如只需复原平音调时，可在已选择琴键的状态下双击调音数值即可。',
      },
    },
    temperament: {
      name: 'Temperament Key',
      nameJa: '音律',
      nameZh: '音律',
      icon: 'KIF-temperament',
      editor: {
        name: 'Temperament Editor',
        nameJa: '音律エディタ',
        nameZh: '音律编辑器',
      },
      key: {
        name: 'Key',
        nameJa: 'セレクトキー',
        nameZh: '主音选择',
      },
      offset: {
        name: 'Temperament',
        nameJa: '音律',
        nameZh: '音律',
      },
      temperament: {
        name: 'Temperament Key',
        nameJa: '音律の主音',
        nameZh: '音律的主音',
      },
      confirmTitle: {
        name: 'Temperament Reset',
        nameJa: '音律リセット',
        nameZh: '音律复原',
      },
      confirmText: {
        name: 'Tap the [OK] button to reset the temperament to the default (flat) User temperament setting.\n\nTo reset a single note, select the desired key then double-tap the Tuning value.',
        nameJa: '「リセット」ボタンをタップすると現在編集中の音律データが全て初期状態に戻ります。\n単音だけリセットしたい場合は、キーを選択した状態で音律の値をダブルタップしてください。',
        nameZh: '点击“复原”后，正在编辑中的音律数据将全部恢复为初始状态。\n如只需复原平音调时，可在已选择琴键的状态下双击音律数值即可。',
      },
    },
    keyVol: {
      name: 'Key Volume',
      nameJa: '88鍵ボリューム',
      nameZh: '琴键音量',
      icon: 'KIF-key-volume',
      editor: {
        name: 'Key Volume Editor',
        nameJa: '88鍵ボリュームエディタ',
        nameZh: '琴键音量编辑器',
      },
      key: {
        name: 'Key',
        nameJa: 'セレクトキー',
        nameZh: '主音选择',
      },
      offset: {
        name: 'Volume',
        nameJa: 'ボリューム',
        nameZh: '音量',
      },
      confirmTitle: {
        name: 'Key Volume Reset',
        nameJa: '88鍵ボリュームリセット',
        nameZh: '琴键音量复原',
      },
      confirmText: {
        name: 'Tap the [OK] button to reset the key volume to the default (flat) User key volume setting.\n\nTo reset a single note, select the desired key then double-tap the Volume value.',
        nameJa: '「リセット」ボタンをタップすると現在編集中の88鍵ボリュームデータが全て初期状態に戻ります。\n単音だけリセットしたい場合は、キーを選択した状態でボリュームの値をダブルタップしてください。',
        nameZh: '点击“复原”后，正在编辑中的琴键音量数据将全部恢复为初始状态。\n如只需复原平音调时，可在已选择琴键的状态下双击琴键音量数值即可。',
      },
    },
    halfPedal: {
      name: 'Half Pedal Adjust',
      nameJa: 'ハーフペダルアジャスト',
      nameZh: '延音开启反应灵敏度',
      icon: 'KIF-pedal',
    },
    softPedal: {
      name: 'Soft Pedal Depth',
      nameJa: 'ソフトペダルデプス',
      nameZh: '柔音踏板效果程度',
      icon: 'KIF-pedal',
    },
    resoDepth: {
      name: 'Resonance Depth',
      nameJa: 'レゾナンスデプス',
      nameZh: '深度共鸣',
      icon: 'KIF-undamped-string-resonance',
    },
    minimum: {
      name: 'Minimum Touch',
      nameJa: 'ミニマムタッチ',
      nameZh: '最小琴键力度',
      icon: 'KIF-touch-curve',
    },
    temperamentKey: {
      name: 'Temperament Key',
      nameJa: '音律の主音',
      nameZh: '音律的主音',
      icon: 'KIF-temperament',
    },
    damperHold: {
      name: 'Damper Hold',
      nameJa: 'ダンパーホールド',
      nameZh: '延音踏板保持延音',
      icon: 'KIF-pedal',
    },
  },
  menu: {
    title: {
      name: 'Menu',
      nameJa: 'メニュー',
      nameZh: '菜单',
    },
    rec: {
      name: 'Recorder',
      nameJa: 'レコーダー',
      nameZh: '录音器',
      icon: 'KIF-recorder',
    },
    sphp: {
      name: 'Speaker / Headphone',
      nameJa: 'スピーカー / ヘッドホン',
      nameZh: '扬声器 / 耳机',
      icon: 'KIF-headphones',
    },
    fh: {
      name: '4 Hands Mode',
      nameJa: '連弾モード',
      nameZh: '双人演奏模式',
      icon: 'KIF-duet',
      iconR: 'KIF-navigate-next'
    },
    chord: {
      name: 'Chord Reference',
      nameJa: 'コード辞典',
      nameZh: 'Chord Reference',
      icon: 'KIF-keys',
      iconR: 'KIF-navigate-next'
    },
    bt: {
      name: 'Bluetooth',
      nameJa: 'Bluetooth',
      nameZh: '蓝牙',
      icon: 'KIF-bluetooth',
    },
    usb: {
      name: 'USB Memory Rec.',
      nameJa: 'USBメモリレコーダー',
      nameZh: 'USB记忆卡录音器',
      icon: 'KIF-usb-music',
    },
    midi: {
      name: 'MIDI',
      nameJa: 'MIDI',
      nameZh: 'MIDI',
      icon: 'KIF-midi',
    },
    usbAudio: {
      name: 'USB Audio',
      nameJa: 'USBオーディオ',
      nameZh: 'USB Audio',
      icon: 'KIF-usb'
    },
    user: {
      name: 'User Data',
      nameJa: 'ユーザーデータ',
      nameZh: '用户数据',
      icon: 'KIF-user',
    },
    system: {
      name: 'System',
      nameJa: 'システム',
      nameZh: '系统',
      icon: 'KIF-settings',
    },
    manual: {
      name: 'Manual',
      nameJa: 'マニュアル',
      nameZh: '说明书',
      icon: 'KIF-lesson-book',
      iconR: 'KIF-navigate-next'
    },
    dev: {
      name: 'Developper Mode',
      nameJa: 'Developper Mode',
      nameZh: 'Developper Mode',
      icon: 'KIF-plus',
    },
    recSettings: {
      format: {
        name: 'Recording Format',
        nameJa: '録音フォーマット',
        nameZh: '录音格式化',
      },
      soundRec: {
        name: 'Record Sound Changes',
        nameJa: '音色変更の記録',
        nameZh: '音色变更记录',
      },
      inputVol: {
        name: 'Input Volume',
        nameJa: '入力ボリューム',
        nameZh: '录音音量',
      },
      // normalize: {
      //   name: 'Normalize',
      //   nameJa: 'ノーマライズ',
      // },
    },
    sphpSettings: {
      toneCntrl: {
        name: 'Tone Control',
        nameJa: 'トーンコントロール',
        nameZh: '音质控制',
      },
      speakerCharacter: {
        name: 'Speaker Character',
        nameJa: 'スピーカーキャラクター',
        nameZh: '扬声器特性',
      },
      wallEq: {
        name: 'Wall EQ',
        nameJa: 'ウォールEQ',
        nameZh: '墙壁音质均衡器',
      },
      lowVol: {
        name: 'Low Volume Balance',
        nameJa: '小音量バランス',
        nameZh: '小音量平衡',
      },
      speakerVol: {
        name: 'Speaker Volume',
        nameJa: 'スピーカーボリューム',
        nameZh: '扬声器音量',
      },
      shs: {
        name: 'Spatial Headphone Sound',
        nameJa: 'スペイシャル ヘッドホン サウンド',
        nameZh: '耳机声音效果',
      },
      headphoneType: {
        name: 'Headphone Type',
        nameJa: 'ヘッドホンタイプ',
        nameZh: '耳机类型',
      },
      headphoneVol: {
        name: 'Headphone Volume',
        nameJa: 'ヘッドホンボリューム',
        nameZh: '耳机音量',
      },
      lineInVol: {
        name: 'Line In Volume',
        nameJa: 'ラインインレベル',
        nameZh: 'Line In Volume',
      },
    },
    fhSettings: {
      rightHand: {
        name: 'Right Side Sound',
        nameJa: '高音側音色',
        nameZh: '高音域音色',
      },
      leftHand: {
        name: 'Left Side Sound',
        nameJa: '低音側音色',
        nameZh: '低音域音色',
      },
      bothHand: {
        name: 'Sound',
        nameJa: '音色',
        nameZh: '音色',
      },
      settings: {
        name: 'Settings',
        nameJa: '設定',
        nameZh: '设置',
      },
      balance: {
        name: 'Balance',
        nameJa: '音量バランス',
        nameZh: '音量平衡',
      },
      octaveShiftR: {
        name: 'Octave Shift Right',
        nameJa: '高音側オクターブシフト',
        nameZh: '高音域八度音移行',
      },
      octaveShiftL: {
        name: 'Octave Shift Left',
        nameJa: '低音側オクターブシフト',
        nameZh: '低音域八度音移行',
      },
      split: {
        name: 'Split Point',
        nameJa: 'スプリットポイント',
        nameZh: '分割点',
      }
    },
    btSettings: {
      onoff: {
        name: 'Bluetooth',
        nameJa: 'Bluetooth',
        nameZh: '蓝牙',
      },
      midi: {
        name: 'Bluetooth MIDI',
        nameJa: 'Bluetooth MIDI',
        nameZh: '蓝牙MIDI',
      },
      audio: {
        name: 'Bluetooth Audio',
        nameJa: 'Bluetoothオーディオ',
        nameZh: '蓝牙音频',
      },
      pairing: {
        name: 'Bluetooth Audio Pairing',
        nameJa: 'Bluetoothオーディオペアリング',
        nameZh: '蓝牙音频配对',
      },
      audioVol: {
        name: 'Bluetooth Audio Volume',
        nameJa: 'Bluetoothオーディオボリューム',
        nameZh: '蓝牙音频音量',
      },
      midiName: {
        name: 'Bluetooth MIDI Device Name',
        nameJa: 'Bluetooth MIDI 表示名',
        nameZh: '蓝牙MIDI显示名称',
      },
      confirmPairing: {
        name: 'Tap the [Pairing] button to disconnect with the paired smart device, and enter the pairing standby state for the new smart device.',
        nameJa: '「ペアリング」ボタンをタップするとペアリング済みのスマートデバイスとの接続を解除し、新たなスマートデバイスとのペアリング待機状態になります。',
        nameZh: '点击“配对”，断开与当前配对设备的连接，进入与其它设备配对的待机状态。',
      },
    },
    usbSettings: {
      recFormat: {
        name: 'Recording Format',
        nameJa: '録音フォーマット',
        nameZh: '录音格式化',
      },
      gain: {
        name: 'Recording Level',
        nameJa: '録音レベル',
        nameZh: '录音级别',
      },
      save: {
        name: 'USB Memory Data Save',
        nameJa: 'データ保存',
        nameZh: '数据保存',
      },
      load: {
        name: 'USB Memory Data Load',
        nameJa: 'データ読み込み',
        nameZh: '数据读取',
      },
      access: {
        name: 'USB Memory Access',
        nameJa: 'データ操作',
        nameZh: '数据操作',
      },
      format: {
        name: 'Formatting USB Memory',
        nameJa: 'USBメモリフォーマット',
        nameZh: 'USB格式化',
      },
    },
    midiSettings: {
      channel: {
        name: 'Play MIDI Channel',
        nameJa: '演奏MIDIチャンネル',
        nameZh: '演奏MIDI频道',
      },
      sendPc: {
        name: 'Send Program Change',
        nameJa: 'プログラムナンバー送信',
        nameZh: '发送编程号码',
      },
      local: {
        name: 'Local Control',
        nameJa: 'ローカルコントロール',
        nameZh: '本地控制',
      },
      transPc: {
        name: 'Transmit Program Change',
        nameJa: 'プログラムナンバー送信',
        nameZh: '发送编程号码',
      },
      multiTimbre: {
        name: 'Multi-timbral Mode',
        nameJa: 'マルチティンバーモード',
        nameZh: '多音色模式',
      },
    },
    usbAudioSettings: {
      inputVol: {
        name: 'Input Volume',
        nameJa: '入力ボリューム',
        nameZh: 'Input Volume'
      }
    },
    userSettings: {
      saveSettings: {
        name: 'Save settings to Piano',
        nameJa: 'ピアノへの設定保存',
        nameZh: '设定保存',
      },
      soundsFavorite: {
        name: 'Sounds | Favorite',
        nameJa: 'お気に入り音色',
        nameZh: '收藏音色',
      },
      soundsRecently: {
        name: 'Sounds | Recently Played',
        nameJa: '最近弾いた音色',
        nameZh: '近期弹奏的音色',
      },
      soundsUser: {
        name: 'Sounds | User',
        nameJa: 'ユーザー音色',
        nameZh: '用户音色',
      },
      musicFavorite: {
        name: 'Music | Favorite',
        nameJa: 'お気に入り曲',
        nameZh: '收藏曲目',
      },
      musicRecently: {
        name: 'Music | Recently Played',
        nameJa: '最近再生した曲',
        nameZh: '历史播放记录',
      },
      musicRecorder: {
        name: 'Music | Recorder',
        nameJa: '録音した曲',
        nameZh: '录制的曲目',
      },
      factoryReset: {
        name: 'Factory Reset',
        nameJa: '初期状態にリセットする',
        nameZh: '恢复出厂设置',
      },

      confirmTitle: {
        name: 'User Data Reset',
        nameJa: 'データリセット',
        nameZh: '数据复原',
      },
      confirmSoundFavorite: {
        name: 'Tap the [OK] button to clear the list of Favorite sounds in the Sounds tab.',
        nameJa: '「リセット」ボタンをタップするとサウンドタブのお気に入り音色データを削除します。',
        nameZh: '点击“复原”，删除收藏音色。',
      },
      confirmSoundRecently: {
        name: 'Tap the [OK] button to clear the list of Recently Played sounds in the Sounds tab.',
        nameJa: '「リセット」ボタンをタップするとサウンドタブの最近弾いた音色データを削除します。',
        nameZh: '点击“复原”，删除音色页面中最近弹奏的音色。',
      },
      confirmSoundUser: {
        name: 'Tap the [OK] button to clear the list of User sounds in the Sounds tab.',
        nameJa: '「リセット」ボタンをタップするとサウンドタブのユーザー音色データを削除します。',
        nameZh: '点击“复原”，删除音色页面中的用户音色。',
      },
      confirmMusicFavorite: {
        name: 'Tap the [OK] button to clear the list of Favorite songs/pieces in the Music tab.',
        nameJa: '「リセット」ボタンをタップするとミュージックタブのお気に入り曲データを削除します。',
        nameZh: '点击“复原”，删除音乐页面中的收藏乐曲。',
      },
      confirmMusicRecently: {
        name: 'Tap the [OK] button to clear the list of Recently Played songs/pieces in the Music tab.',
        nameJa: '「リセット」ボタンをタップするとミュージックタブの最近再生した曲データを削除します。',
        nameZh: '点击“复原”，删除音乐页面中最近已播放的乐曲。',
      },
      confirmMusicRecorder: {
        name: 'Tap the [OK] button to clear the list of Recorder Playback songs/pieces in the Music tab, and delete all of the recorder songs/pieces saved to the device\'s memory.',
        nameJa: '「リセット」ボタンをタップするとミュージックタブの録音した曲データを削除します。',
        nameZh: '点击“复原”，删除音乐页面中已录音的乐曲。',
      },
      confirmFactoryReset: {
        name: 'Tap the [OK] button to clear all user data, delete all of the recorder songs/pieces saved to the device\'s memory, and retore the PianoRemote app to the factory default configuration.',
        nameJa: '「リセット」ボタンをタップすると全てのユーザデータを削除し、ピアノの設定を初期状態に戻します。',
        nameZh: '点击“复原”，可删除全部用户数据，并且数码钢琴的设定将返回至出厂设置。',
      },
      progressFactoryReset: {
        name: 'Initializing data.\n\nPlease do not turn off the instrument\'s power.',
        nameJa: '初期化中。\n電源をオフしないで下さい。',
        nameZh: '正在返回出厂设置中。\n请勿关闭电源。',
      },
      completeFactoryReset: {
        name: 'Initialization complete.\n\nThe user interface will be reloaded.',
        nameJa: '設定の初期化を完了しました。画面をリロードします。',
        nameZh: '设定已返回出厂设置。重新加载画面。',
      },

    },
    systemSettings: {
      lcdBrightness: {
        name: 'LCD Brightness',
        nameJa: '画面の明るさ',
        nameZh: '画面亮度',
      },
      displayScale: {
        name: 'Display Scale',
        nameJa: '表示サイズ',
        nameZh: '显示尺寸',
      },
      displayOff: {
        name: 'Auto Display Off',
        nameJa: 'オートディスプレイオフ',
        nameZh: '显示器自动关闭',
      },
      screenSaver: {
        name: 'Screen Saver',
        nameJa: 'スクリーンセーバー',
        nameZh: '屏幕保护设置',
      },
      powerOff: {
        name: 'Auto Power Off',
        nameJa: 'オートパワーオフ',
        nameZh: '自动关机',
      },
      startupScreen: {
        name: 'Startup Screen',
        nameJa: '起動画面',
        nameZh: '启动画面',
      },
      startupSettings: {
        name: 'Startup Settings',
        nameJa: '起動設定',
        nameZh: '启动设置',
      },
      hymn: {
        name: 'Hymn Player',
        nameJa: 'ヒムプレイヤー',
        nameZh: 'Hymn Player',
      },
      language: {
        name: 'Language',
        nameJa: '表示言語',
        nameZh: '显示语言',
      },
      info: {
        name: 'Information',
        nameJa: 'インフォメーション',
        nameZh: '信息',
      },
    },
    displayScaleEnum: [
      {
        name: 'Small',
        nameJa: '小さい',
        nameZh: '小'
      },
      {
        name: 'Normal',
        nameJa: '標準',
        nameZh: '标准'
      },
      {
        name: 'Large',
        nameJa: '大きい',
        nameZh: '大'
      },
    ],
    displayOffEnum: [
      {
        name: 'Never',
        nameJa: 'オフ',
        nameZh: '关闭',
      },
      {
        name: '30 Seconds',
        nameJa: '30秒',
        nameZh: '30秒',
      },
      {
        name: '1 Minute',
        nameJa: '1分',
        nameZh: '1分',
      },
      {
        name: '2 Minutes',
        nameJa: '2分',
        nameZh: '2分',
      },
      {
        name: '3 Minutes',
        nameJa: '3分',
        nameZh: '3分',
      },
      {
        name: '4 Minutes',
        nameJa: '4分',
        nameZh: '4分',
      },
      {
        name: '5 Minutes',
        nameJa: '5分',
        nameZh: '5分',
      },
    ],
    startUpWindowEnum: [
      {
        name: 'Piano',
        nameJa: 'ピアノ',
        nameZh: '钢琴',
        description: 'Start up with "Piano" tab',
        descriptionJa: '起動時にピアノタブを表示します',
        descriptionZh: '启动时显示钢琴页面'
      },
      {
        name: 'Sounds',
        nameJa: 'サウンド',
        nameZh: '音色',
        description: 'Start up with "Sounds" tab',
        descriptionJa: '起動時にサウンドタブを表示します',
        descriptionZh: '启动时显示音色页面'
      },
      {
        name: 'Music',
        nameJa: 'ミュージック',
        nameZh: '音乐',
        description: 'Start up with "Music" tab',
        descriptionJa: '起動時にミュージックタブを表示します',
        descriptionZh: '启动时显示音乐页面'
      }
    ],
    startUpSettingsEnum: [
      {
        name: 'Reset',
        nameJa: 'デフォルト',
        nameZh: '初期默认状态',
        description: 'Start up with default settings',
        descriptionJa: 'デフォルトの設定で起動します',
        descriptionZh: '初期默认状态下启动'
      },
      {
        name: 'Current',
        nameJa: '現在',
        nameZh: '当前',
        description: 'Start up with current settings',
        descriptionJa: '現在の設定で起動します',
        descriptionZh: '在当前设置状态下启动'
      },
      {
        name: 'Power Off',
        nameJa: '電源OFF時',
        nameZh: '电源关闭时',
        description: 'Start up with last settings',
        descriptionJa: '電源OFF時の設定で起動します',
        descriptionZh: '在电源设定关闭的状态时启动'
      }
    ],
    languageEnum: [
      {
        name: 'English',
        nameJa: '英語',
        nameZh: '英文'
      },
      {
        name: 'Japanese',
        nameJa: '日本語',
        nameZh: '日文'
      },
      {
        name: 'Chinese',
        nameJa: '中国語',
        nameZh: '中文'
      }
      // {
      //   name: 'Engligh (UK)',
      //   nameJa: '英語 (英国)'
      // },
      // {
      //   name: 'Engligh (Australia)',
      //   nameJa: '英語 (オーストラリア)'
      // },
      // {
      //   name: 'Français',
      //   nameJa: 'フランス語'
      // },
      // {
      //   name: 'Deutsch',
      //   nameJa: 'ドイツ語'
      // },
      // {
      //   name: 'Español',
      //   nameJa: 'スペイン語'
      // },
      // {
      //   name: 'Italiano',
      //   nameJa: 'イタリア語'
      // }
    ],
    screenSaverEnum: [
      {
        img: '../img/001.jpg',
      },
      {
        img: '../img/002.jpg',
      },
      {
        img: '../img/003.jpg',
      },
      {
        img: '../img/004.jpg',
      },
      {
        img: '../img/005.jpg',
      },
      {
        img: '../img/006.jpg',
      },
      {
        img: '../img/007.jpg',
      },
      {
        img: '../img/008.jpg',
      },
      {
        img: '../img/009.jpg',
      },
      {
        img: '../img/010.jpg',
      },
      {
        img: '../img/011.jpg',
      },
      {
        img: '../img/012.jpg',
      },
      {
        img: '../img/013.jpg',
      },
      {
        img: '../img/014.jpg',
      },
      {
        img: '../img/015.jpg',
      },
      {
        img: '../img/016.jpg',
      },
      {
        img: '../img/017.jpg',
      },
      {
        img: '../img/018.jpg',
      },
      {
        img: '../img/019.jpg',
      },
      {
        img: '../img/020.jpg',
      },
      {
        img: '../img/021.jpg',
      },
      {
        img: '../img/022.jpg',
      },
      {
        img: '../img/023.jpg',
      },
      {
        img: '../img/024.jpg',
      },
      {
        img: '../img/025.jpg',
      },
      {
        img: '../img/026.jpg',
      },
      {
        img: '../img/027.jpg',
      },
      {
        img: '../img/028.jpg',
      },
      {
        img: '../img/029.jpg',
      },
      {
        img: '../img/030.jpg',
      },
      {
        img: '../img/031.jpg',
      },
      {
        img: '../img/032.jpg',
      },
      {
        img: '../img/033.jpg',
      },
      {
        img: '../img/034.jpg',
      },
      {
        img: '../img/035.jpg',
      },
      {
        img: '../img/036.jpg',
      },
      {
        img: '../img/037.jpg',
      },
      {
        img: '../img/038.jpg',
      },
      {
        img: '../img/039.jpg',
      },
      {
        img: '../img/040.jpg',
      },
      {
        img: '../img/041.jpg',
      }
    ],
  },
  contentsMenu: {
    renameSound: {
      name: 'Rename',
      nameJa: '名前を変更する',
      nameZh: '重命名',
      item: 'renameSound'
    },
    deleteSound: {
      name: 'Delete',
      nameJa: '音色を削除する',
      nameZh: '删除音色',
      item: 'deleteSound'
    },
    shareMusic: {
      name: 'Share',
      nameJa: '共有',
      nameZh: '共有',
      item: 'shareMusic'
    },
    overdubMusic: {
      name: 'Overdub',
      nameJa: 'オーバーダビング',
      nameZh: '多重录音',
      item: 'overdubMusic'
    },
    renameMusic: {
      name: 'Rename',
      nameJa: '名前を変更する',
      nameZh: '重命名',
      item: 'renameMusic'
    },
    deleteMusic: {
      name: 'Delete',
      nameJa: '曲を削除する',
      nameZh: '删除乐曲',
      item: 'deleteMusic'
    },
    confirmDeleteSoundTitle: {
      name: 'Delete a user sound',
      nameJa: '音色データ削除',
      nameZh: '删除音色',
    },
    confirmDeleteSound: {
      name: 'Tap the [DELETE] button to delete the selected user sound.',
      nameJa: '「削除」ボタンをタップすると選択した音色データを削除します。',
      nameZh: '点击“删除”，删除已选音色。',
    },
    confirmDeleteMusicTitle: {
      name: 'Delete Recorder Song',
      nameJa: '楽曲データ削除',
      nameZh: '删除乐曲',
    },
    confirmDeleteMusic: {
      name: 'Tap the [DELETE] button to delete the selected recorder song.',
      nameJa: '「削除」ボタンをタップすると選択した曲データを削除します。',
      nameZh: '点击“删除”，删除已选乐曲。',
    },
  },
  musicMenu: {
    share: {
      name: 'Share',
      nameJa: '共有',
      nameZh: '共有',
      item: 'share'
    },
    overdub: {
      name: 'Overdub',
      nameJa: 'オーバーダビング',
      nameZh: '多重录音',
      item: 'overdub'
    },
    rename: {
      name: 'Rename',
      nameJa: '名前を変更する',
      nameZh: '重命名',
      item: 'rename'
    },
    delete: {
      name: 'Delete',
      nameJa: '曲を削除する',
      nameZh: '删除乐曲',
      item: 'delete'
    },
    confirmTitle: {
      name: 'Delete Recorder Song',
      nameJa: '楽曲データ削除',
      nameZh: '删除乐曲',
    },
    confirmDelete: {
      name: 'Tap the [DELETE] button to delete the selected recorder song.',
      nameJa: '「削除」ボタンをタップすると選択した曲データを削除します。',
      nameZh: '点击“删除”，删除已选乐曲。',
    },
  },
  eq: {
    title: {
      name: 'User Tone Control',
      nameJa: 'ユーザー',
      nameZh: '用户',
    },
    gainLow: {
      name: 'Low',
      nameJa: '低域レベル',
      nameZh: '低音域音量水平',
    },
    gainMidLow: {
      name: 'Mid-low dB ',
      nameJa: '中域1レベル',
      nameZh: '中音域1音量水平',
    },
    gainMidHigh: {
      name: 'Mid-high db',
      nameJa: '中域2レベル',
      nameZh: '中音域2音量水平',
    },
    gainHigh: {
      name: 'High',
      nameJa: '高域レベル',
      nameZh: '高音域音量水平',
    },
    freqMidLow: {
      name: 'Mid-low Frequency',
      nameJa: '中域1周波数',
      nameZh: '中音域1周波数',
    },
    freqMidHigh: {
      name: 'Mid-high Frequency',
      nameJa: '中域2周波数',
      nameZh: '中音域2周波数',
    },
  },
  buttonLabel: {
    on: {
      name: 'ON',
      nameJa: 'オン',
      nameZh: '开启',
    },
    off: {
      name: 'OFF',
      nameJa: 'オフ',
      nameZh: '关闭',
    },
    edit: {
      name: 'EDIT',
      nameJa: '編集',
      nameZh: '编辑',
    },
    dual: {
      name: 'DUAL',
      nameJa: 'デュアル',
      nameZh: '双音色模式',
    },
    split: {
      name: 'SPLIT',
      nameJa: 'スプリット',
      nameZh: '音色分割模式',
    },
    close: {
      name: 'CLOSE',
      nameJa: '閉じる',
      nameZh: '关闭',
    },
    format: {
      name: 'FORMAT',
      nameJa: '実行する',
      nameZh: '实行',
    },
    reset: {
      name: 'RESET',
      nameJa: 'リセット',
      nameZh: '复原',
    },
    delete: {
      name: 'DELETE',
      nameJa: '削除',
      nameZh: '删除',
    },
    check: {
      name: 'CHECK',
      nameJa: '確認',
      nameZh: '确认',
    },
    view: {
      name: 'VIEW',
      nameJa: '実行する',
      nameZh: '实行',
    },
    ok: {
      name: 'OK',
      nameJa: 'リセット',
      nameZh: '复原',
    },
    cancel: {
      name: 'Cancel',
      nameJa: 'キャンセル',
      nameZh: '取消',
    },
    connect: {
      name: 'Bluetooth MIDI Connect',
      nameJa: 'Bluetooth MIDI 接続',
      nameZh: '蓝牙 MIDI 连接',
    },
    exitDemo: {
      name: 'Exit Demo Mode',
      nameJa: 'デモモードを終了する',
      nameZh: '结束演示模式',
    },
    recCancel: {
      name: 'Rec Cancel',
      nameJa: '録音キャンセル',
      nameZh: '取消录音',
    },
    save: {
      name: 'Save',
      nameJa: '保存',
      nameZh: '保存',
    },
    pairing: {
      name: 'Pairing',
      nameJa: 'ペアリング',
      nameZh: '配对',
    },
  },
  valueTable: {
    reverb: {
      roomTime: [0, 6, 12, 19, 28, 32, 37, 41, 46, 50],
      loungeTime: [17, 20, 23, 27, 32, 34, 36, 38, 40, 42],
      smallHallTime: [10, 16, 22, 30, 40, 44, 48, 52, 56, 60],
      concertHallTime: [19, 24, 29, 34, 44, 50, 56, 64, 80, 104],
      liveHallTime: [19, 23, 27, 32, 40, 44, 49, 54, 59, 70],
      cathedralTime: [31, 34, 37, 40, 46, 63, 89, 99, 109, 119],
    },
    effect: {
      monoDelay: [3, 5, 11, 16, 21, 32, 43, 54, 64, 75], // Mono Delay
      pingpongDelay: [3, 11, 21, 32, 43, 48, 54, 64, 70, 75], // PingPong Delay
      tripleDelay: [3, 11, 21, 43, 54, 56, 59, 64, 70, 75], // Triple Delay
      chorus: [2, 3, 4, 6, 8, 12, 16, 20, 28, 36], // Chorus
      classicChorus: [2, 3, 4, 5, 7, 10, 14, 18, 24, 31], // Classic Chorus
      ensemble: [2, 3, 4, 6, 8, 12, 16, 20, 28, 36], // Ensemble
      tremolo: [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Tremolo
      classicTremolo: [8, 21, 34, 47, 60, 68, 77, 85, 94, 103], // Classic Tremolo
      vibratoTremolo: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Vibrato Tremolo
      tremoloAmp: [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Tremolo+Amp
      autoPan: [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Auto Pan
      classicAutoPan: [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Classic Auto Pan
      autoPanAmp: [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Auto Pan+Amp
      phser: [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Phaser
      classicPhaser: [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Classic Phaser
      phaserAutoPan: [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Phaser+Auto Pan
      phaserAmp: [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Phaser+Amp
      phaserChorus: [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Phaser+Chorus
      rotary1: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary1
      rotary2: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary2
      rotary3: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary3
      rotary4: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary4
      rotary5: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary5
      rotary6: [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary6
    },
    vt: {
      damperNoise: [0, 12, 25, 35, 42, 50, 60, 72, 86, 104, 127],
      fallbackNoise: [0, 12, 25, 35, 42, 50, 60, 72, 86, 104, 127],
      hammerNoise: [0, 26, 38, 46, 53, 60, 68, 77, 89, 104, 127],
      resoRendering: [0, 12, 25, 37, 50, 63, 75, 88, 101, 114, 127],
      stringReso: [0, 12, 25, 37, 50, 63, 75, 88, 101, 114, 127],
      undampedReso: [0, 12, 25, 37, 50, 63, 75, 88, 101, 114, 127],
      release: [-8, -6, -4, -2, 0, 2, 4, 6, 8, 10],
    }
  },
  about: {
    version: {
      title: {
        UI: {
          name: 'UI',
          nameJa: 'UI',
          nameZh: 'UI'
        },
        app: {
          name: 'App',
          nameJa: 'アプリ',
          nameZh: '应用程序',
          nameEmbed: 'Touch panel System',
          nameEmbedJa: 'タッチパネルシステム',
          nameEmbedZh: 'Touch panel System',
        },
        firmware: {
          name: 'Piano',
          nameJa: 'ピアノ',
          nameZh: '钢琴',
          nameEmbed: 'Firmware',
          nameEmbedJa: 'ファームウェア',
          nameEmbedZh: 'Firmware',
        },
      },
      status: {
        update: {
          title: 'Updating...',
          titleJa: 'アップデートしています...',
          titleZh: '正在更新中...',
          text: "While the update is in process, please do not turn off the instrument's power.",
          textJa: '電源をオフしないで下さい。',
          textZh: '请勿关闭电源。',
        },
        completed: {
          title: 'Update successful!',
          titleJa: 'アップデートされました！',
          titleZh: '已更新',
          text: 'Please turn off the piano.',
          textJa: '電源をオフして下さい。',
          textZh: '请关闭电源。',
        },
        error: {
          title: 'Error!',
          titleJa: '失敗しました！',
          titleZh: '失败',
          text: 'Please turn the instrument off, then on again, and then restart the update process.',
          textJa: '電源を入れ直し、\n初めからやり直して下さい。',
          textZh: '请从新开启电源后，\n重新开始操作。',
        },
      }
    },
    license: {
      title: {
        name: 'License',
        nameJa: 'ライセンス',
        nameZh: '许可',
      },
      body: `# vue
      Copyright (c) 2013-present, Yuxi (Evan) You
      vuejs/vue is licensed under the MIT License
      https://github.com/vuejs/vue/blob/dev/LICENSE

      # material-components-web
      Copyright (c) 2014-2019 Google, Inc.
      material-components/material-components-web is licensed under the MIT License
      https://github.com/material-components/material-components-web/blob/master/LICENSE

      # axios
      Copyright (c) 2014-present Matt Zabriskie
      axios/axios is licensed under the MIT License
      https://github.com/axios/axios/blob/master/LICENSE

      # material-design-icons
      Copyright (c) 2014-2019 Google, Inc.
      google/material-design-icons is licensed under the Apache License 2.0
      https://github.com/google/material-design-icons/blob/master/LICENSE

      # encoding.js
      Copyright (c) 2014-2019 Polygon Planet
      polygonplanet/encoding.js is licensed under the MIT License
      https://github.com/polygonplanet/encoding.js/blob/master/LICENSE

      ----------
      # The MIT License

      Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

      The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

      ----------
      # Apache License, Version 2.0

      Licensed under the Apache License, Version 2.0 (the "License");
      you may not use this file except in compliance with the License. You may obtain a copy of the License at

          http://www.apache.org/licenses/LICENSE-2.0

      Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`,
      embeded: `
      ----------
      This product includes software licensed under the GNU General Public License (GPL). You can obtain the source code of the software and copy, distribute and modify it according to the GPL.

      https://www.kawai-global.com/product/c/digitalpianos/


      NOTE! This copyright does *not* cover user programs that use kernel services by normal system calls - this is merely considered normal use of the kernel, and does *not* fall under the heading of "derived work". Also note that the GPL below is copyrighted by the Free Software Foundation, but the instance of code that it refers to (the Linux kernel) is copyrighted by me and others who actually wrote it.

      Also note that the only valid version of the GPL as far as the kernel is concerned is _this_ particular version of the license (ie v2, not v2.2 or v3.x or whatever), unless explicitly otherwise stated.

      Linus Torvalds

      ----------------------------------------

      GNU GENERAL PUBLIC LICENSE
      Version 2, June 1991

      Copyright (C) 1989, 1991 Free Software Foundation, Inc.
      51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
      Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

      Preamble

      The licenses for most software are designed to take away your freedom to share and change it.  By contrast, the GNU General Public License is intended to guarantee your freedom to share and change free software--to make sure the software is free for all its users.  This General Public License applies to most of the Free Software Foundation's software and to any other program whose authors commit to using it.  (Some other Free Software Foundation software is covered by the GNU Library General Public License instead.)  You can apply it to your programs, too.

      When we speak of free software, we are referring to freedom, not price.  Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for this service if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs; and that you know you can do these things.

      To protect your rights, we need to make restrictions that forbid anyone to deny you these rights or to ask you to surrender the rights. These restrictions translate to certain responsibilities for you if you distribute copies of the software, or if you modify it.

      For example, if you distribute copies of such a program, whether gratis or for a fee, you must give the recipients all the rights that you have.  You must make sure that they, too, receive or can get the source code.  And you must show them these terms so they know their rights.

      We protect your rights with two steps: (1) copyright the software, and (2) offer you this license which gives you legal permission to copy, distribute and/or modify the software.  Also, for each author's protection and ours, we want to make certain that everyone understands that there is no warranty for this free software.  If the software is modified by someone else and passed on, we want its recipients to know that what they have is not the original, so that any problems introduced by others will not reflect on the original authors' reputations.

      Finally, any free program is threatened constantly by software patents.  We wish to avoid the danger that redistributors of a free program will individually obtain patent licenses, in effect making the program proprietary.  To prevent this, we have made it clear that any patent must be licensed for everyone's free use or not licensed at all.

      The precise terms and conditions for copying, distribution and modification follow.

      GNU GENERAL PUBLIC LICENSE
      TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

      0. This License applies to any program or other work which contains a notice placed by the copyright holder saying it may be distributed under the terms of this General Public License.  The "Program", below, refers to any such program or work, and a "work based on the Program" means either the Program or any derivative work under copyright law: that is to say, a work containing the Program or a portion of it, either verbatim or with modifications and/or translated into another language.  (Hereinafter, translation is included without limitation in the term "modification".)  Each licensee is addressed as "you".

      Activities other than copying, distribution and modification are not covered by this License; they are outside its scope.  The act of running the Program is not restricted, and the output from the Program is covered only if its contents constitute a work based on the Program (independent of having been made by running the Program). Whether that is true depends on what the Program does.

      1. You may copy and distribute verbatim copies of the Program's source code as you receive it, in any medium, provided that you conspicuously and appropriately publish on each copy an appropriate copyright notice and disclaimer of warranty; keep intact all the notices that refer to this License and to the absence of any warranty; and give any other recipients of the Program a copy of this License along with the Program.

      You may charge a fee for the physical act of transferring a copy, and you may at your option offer warranty protection in exchange for a fee.

      2. You may modify your copy or copies of the Program or any portion of it, thus forming a work based on the Program, and copy and distribute such modifications or work under the terms of Section 1 above, provided that you also meet all of these conditions:

      a) You must cause the modified files to carry prominent notices stating that you changed the files and the date of any change.

      b) You must cause any work that you distribute or publish, that in whole or in part contains or is derived from the Program or any part thereof, to be licensed as a whole at no charge to all third parties under the terms of this License.

      c) If the modified program normally reads commands interactively when run, you must cause it, when started running for such interactive use in the most ordinary way, to print or display an announcement including an appropriate copyright notice and a notice that there is no warranty (or else, saying that you provide a warranty) and that users may redistribute the program under these conditions, and telling the user how to view a copy of this License.  (Exception: if the Program itself is interactive but does not normally print such an announcement, your work based on the Program is not required to print an announcement.)

      These requirements apply to the modified work as a whole.  If identifiable sections of that work are not derived from the Program, and can be reasonably considered independent and separate works in themselves, then this License, and its terms, do not apply to those sections when you distribute them as separate works.  But when you distribute the same sections as part of a whole which is a work based on the Program, the distribution of the whole must be on the terms of this License, whose permissions for other licensees extend to the entire whole, and thus to each and every part regardless of who wrote it.

      Thus, it is not the intent of this section to claim rights or contest your rights to work written entirely by you; rather, the intent is to exercise the right to control the distribution of derivative or collective works based on the Program.

      In addition, mere aggregation of another work not based on the Program with the Program (or with a work based on the Program) on a volume of a storage or distribution medium does not bring the other work under the scope of this License.

      3. You may copy and distribute the Program (or a work based on it, under Section 2) in object code or executable form under the terms of Sections 1 and 2 above provided that you also do one of the following:

      a) Accompany it with the complete corresponding machine-readable source code, which must be distributed under the terms of Sections 1 and 2 above on a medium customarily used for software interchange; or,

      b) Accompany it with a written offer, valid for at least three years, to give any third party, for a charge no more than your cost of physically performing source distribution, a complete machine-readable copy of the corresponding source code, to be distributed under the terms of Sections 1 and 2 above on a medium customarily used for software interchange; or,

      c) Accompany it with the information you received as to the offer to distribute corresponding source code.  (This alternative is allowed only for noncommercial distribution and only if you received the program in object code or executable form with such an offer, in accord with Subsection b above.)

      The source code for a work means the preferred form of the work for making modifications to it.  For an executable work, complete source code means all the source code for all modules it contains, plus any associated interface definition files, plus the scripts used to control compilation and installation of the executable.  However, as a special exception, the source code distributed need not include anything that is normally distributed (in either source or binary form) with the major components (compiler, kernel, and so on) of the operating system on which the executable runs, unless that component itself accompanies the executable.

      If distribution of executable or object code is made by offering access to copy from a designated place, then offering equivalent access to copy the source code from the same place counts as distribution of the source code, even though third parties are not compelled to copy the source along with the object code.

      4. You may not copy, modify, sublicense, or distribute the Program except as expressly provided under this License.  Any attempt otherwise to copy, modify, sublicense or distribute the Program is void, and will automatically terminate your rights under this License. However, parties who have received copies, or rights, from you under this License will not have their licenses terminated so long as such parties remain in full compliance.

      5. You are not required to accept this License, since you have not signed it.  However, nothing else grants you permission to modify or distribute the Program or its derivative works.  These actions are prohibited by law if you do not accept this License.  Therefore, by modifying or distributing the Program (or any work based on the Program), you indicate your acceptance of this License to do so, and all its terms and conditions for copying, distributing or modifying the Program or works based on it.

      6. Each time you redistribute the Program (or any work based on the Program), the recipient automatically receives a license from the original licensor to copy, distribute or modify the Program subject to these terms and conditions.  You may not impose any further restrictions on the recipients' exercise of the rights granted herein. You are not responsible for enforcing compliance by third parties to this License.

      7. If, as a consequence of a court judgment or allegation of patent infringement or for any other reason (not limited to patent issues), conditions are imposed on you (whether by court order, agreement or otherwise) that contradict the conditions of this License, they do not excuse you from the conditions of this License.  If you cannot distribute so as to satisfy simultaneously your obligations under this License and any other pertinent obligations, then as a consequence you may not distribute the Program at all.  For example, if a patent license would not permit royalty-free redistribution of the Program by all those who receive copies directly or indirectly through you, then the only way you could satisfy both it and this License would be to refrain entirely from distribution of the Program.

      If any portion of this section is held invalid or unenforceable under any particular circumstance, the balance of the section is intended to apply and the section as a whole is intended to apply in other circumstances.

      It is not the purpose of this section to induce you to infringe any patents or other property right claims or to contest validity of any such claims; this section has the sole purpose of protecting the integrity of the free software distribution system, which is implemented by public license practices.  Many people have made generous contributions to the wide range of software distributed through that system in reliance on consistent application of that system; it is up to the author/donor to decide if he or she is willing to distribute software through any other system and a licensee cannot impose that choice.

      This section is intended to make thoroughly clear what is believed to be a consequence of the rest of this License.

      8. If the distribution and/or use of the Program is restricted in certain countries either by patents or by copyrighted interfaces, the original copyright holder who places the Program under this License may add an explicit geographical distribution limitation excluding those countries, so that distribution is permitted only in or among countries not thus excluded.  In such case, this License incorporates the limitation as if written in the body of this License.

      9. The Free Software Foundation may publish revised and/or new versions of the General Public License from time to time.  Such new versions will be similar in spirit to the present version, but may differ in detail to address new problems or concerns.

      Each version is given a distinguishing version number.  If the Program specifies a version number of this License which applies to it and "any later version", you have the option of following the terms and conditions either of that version or of any later version published by the Free Software Foundation.  If the Program does not specify a version number of this License, you may choose any version ever published by the Free Software Foundation.

      10. If you wish to incorporate parts of the Program into other free programs whose distribution conditions are different, write to the author to ask for permission.  For software which is copyrighted by the Free Software Foundation, write to the Free Software Foundation; we sometimes make exceptions for this.  Our decision will be guided by the two goals of preserving the free status of all derivatives of our free software and of promoting the sharing and reuse of software generally.

      NO WARRANTY

      11. BECAUSE THE PROGRAM IS LICENSED FREE OF CHARGE, THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.  EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.  THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.  SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

      12. IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MAY MODIFY AND/OR REDISTRIBUTE THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

      END OF TERMS AND CONDITIONS

      How to Apply These Terms to Your New Programs

      If you develop a new program, and you want it to be of the greatest possible use to the public, the best way to achieve this is to make it free software which everyone can redistribute and change under these terms.

      To do so, attach the following notices to the program.  It is safest to attach them to the start of each source file to most effectively convey the exclusion of warranty; and each file should have at least the "copyright" line and a pointer to where the full notice is found.

      <one line to give the program's name and a brief idea of what it does.>
      Copyright (C) <year>  <name of author>

      This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

      This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

      You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA


      Also add information on how to contact you by electronic and paper mail.

      If the program is interactive, make it output a short notice like this when it starts in an interactive mode:

      Gnomovision version 69, Copyright (C) year name of author Gnomovision comes with ABSOLUTELY NO WARRANTY; for details type \`show w'. This is free software, and you are welcome to redistribute it under certain conditions; type \`show c' for details.

      The hypothetical commands \`show w' and \`show c' should show the appropriate parts of the General Public License.  Of course, the commands you use may be called something other than \`show w' and \`show c'; they could even be mouse-clicks or menu items--whatever suits your program.

      You should also get your employer (if you work as a programmer) or your school, if any, to sign a "copyright disclaimer" for the program, if necessary.  Here is a sample; alter the names:

      Yoyodyne, Inc., hereby disclaims all copyright interest in the program \`Gnomovision' (which makes passes at compilers) written by James Hacker.

      <signature of Ty Coon>, 1 April 1989
      Ty Coon, President of Vice

      This General Public License does not permit incorporating your program into proprietary programs.  If your program is a subroutine library, you may consider it more useful to permit linking proprietary applications with the library.  If this is what you want to do, use the GNU Library General Public License instead of this License.`,
      close: {
        name: 'CLOSE',
        nameJa: '閉じる',
        nameZh: '关闭'
      }
    },
  },
  messages: {
    saveSound: {
      title: 'User Sound Name',
      titleJa: '音色名を入力',
      titleZh: '输入音色名称',
      label: {true:'Save', false:'Cancel'},
      labelJa: {true:'保存', false:'キャンセル'},
      labelZh: {true:'保存', false:'取消'}
    },
    saveRecorder: {
      title: 'Song Name',
      titleJa: '曲名を入力',
      titleZh: '输入乐曲名称',
      label: {true:'Save', false:'Cancel'},
      labelJa: {true:'保存', false:'キャンセル'},
      labelZh: {true:'保存', false:'取消'}
    },
    shareRecorder: {
      title: 'Song Name',
      titleJa: '曲名を入力',
      titleZh: '输入乐曲名称',
      label: {true:'Share', false:'Cancel'},
      labelJa: {true:'共有', false:'キャンセル'},
      labelZh: {true:'共有', false:'取消'}
    },
    saveBleMidiDeviceName: {
      title: 'Device Name',
      titleJa: 'デバイス名を入力',
      titleZh: '输入数码钢琴名称',
      label: {true:'Change', false:'Cancel'},
      labelJa: {true:'変更', false:'キャンセル'},
      labelZh: {true:'变更', false:'取消'}
    },
    deviceError: {
      title: 'Piano Not Connected',
      titleJa: 'ピアノと接続されていません',
      titleZh: '未与数码钢琴连接',
      description: 'The PianoRemote is not connected to the piano. \nPlease tap [Connect] to connect to the piano via Bluetooth MIDI, or connect the piano and smart device via USB cable.\nTap [Demo Mode] to use the app only without connecting to the piano.',
      descriptionJa: 'PianoRemoteがピアノと接続されていません。\n[接続]を押してBluetooth MIDIでご利用のピアノと接続してください。またはUSBケーブルでピアノとスマートデバイスを接続してください。\n[デモモード]を押すとアプリのみで利用可能です。',
      descriptionZh: 'PianoRemote未与数码钢琴连接。\n点击“连接”通过蓝牙MIDI将其连接。或可以使用USB数据线将数码钢琴与智能设备连接。\n点击“演示模式”，仅限APP可以使用。',
      label: {true:'Connect', false:'Demo Mode'},
      labelJa: {true:'接続', false:'デモモード'},
      labelZh: {true:'连接', false:'演示模式'}
    },
    songLoading: {
      description: 'Accessing USB Memory...',
      descriptionJa: 'USBメモリアクセス中...',
      descriptionZh: 'USB记忆卡读取中...',
    },
    recordingWarning: {
      description: 'Recording in progress. \nPlease stop the recording in order to play the song.',
      descriptionJa: '録音中です。\n楽曲を再生するには録音を停止してください。',
      descriptionZh: '正在录音中。\n播放乐曲需要先停止录音。',
    },
    musicStopWorning: {
      title: 'Playing Music',
      titleJa: '楽曲再生中',
      titleZh: '播放乐曲中',
      description: 'Recording cannot be started while song playback is in progress. Would you like to stop song playback?',
      descriptionJa: '楽曲再生中のため録音を開始できません。楽曲再生を停止しますか？',
      descriptionZh: '乐曲播放时无法同时开始录音。是否需要停止播放乐曲？',
      label: {true:'Stop', false:'Cancel'},
      labelJa: {true:'停止', false:'キャンセル'},
      labelZh: {true:'停止', false:'取消'}
    },
    recDeleteConfirm: {
      title: 'Delete Recorder Song',
      titleJa: '録音データ削除',
      titleZh: '删除录音数据',
      description: 'Tap the [DELETE] button to delete the selected recorder song.',
      descriptionJa: '「削除」ボタンをタップすると録音データを削除します。',
      descriptionZh: '点击“删除”，可删除录音数据。',
      label: {true:'DELETE', false:'Cancel'},
      labelJa: {true:'削除', false:'キャンセル'},
      labelZh: {true:'删除', false:'取消'}
    },
    recMemoryFull: {
      title: 'Memory Full',
      titleJa: '録音エラー',
      titleZh: '录音发生错误',
      description: 'The Internal Recorder memory has reached its maximum of 10 songs.  In order to continue recording, please delete an existing song memory.\n\nWould you like to delete the oldest song?',
      descriptionJa: '内蔵レコーダーの録音可能曲数は10曲までです。一番古い曲を削除しますか？',
      descriptionZh: '内存录音器可容纳10首乐曲。是否删除最旧的一首乐曲？',
      label: {true:'DELETE', false:'Cancel'},
      labelJa: {true:'削除', false:'キャンセル'},
      labelZh: {true:'删除', false:'取消'}
    },
    noUsbMemoryMessage: {
      description: 'A USB memory device is not connected. Connect a USB memory device \nto playback songs stored on the device.',
      descriptionJa: 'USBメモリが挿入されていません。\nUSBメモリに保存した楽曲を\n再生することができます。',
      descriptionZh: 'USB未连接成功。\n无法播放USB中的乐曲。',
    },
    usbFileError: {
      title: 'Loading Error',
      titleJa: '読み込みエラー',
      titleZh: '读取发生错误',
      description: 'File loading failed. Would you like to remove this file from the list? (The data stored on the USB memory device will not be affected.)',
      descriptionJa: 'ファイルを読み込む事ができません。リストからファイルを削除しますか？ (USBメモリ内のデータは削除されません。)',
      descriptionZh: '无法读取文件。是否删除文件？（USB中的数据不会被删除）',
    },
    usbMemoryError: {
      title: 'USB Memory Error',
      titleJa: 'USBメモリエラー',
      titleZh: 'USB发生错误',
      description: 'File loading failed.',
      descriptionJa: 'ファイルを読み込む事ができません。\n繰り返しこのエラーが表示される場合は、フォーマットを実行するか、別のUSBメモリに交換してください。',
      descriptionZh: '无法读取文件。\n如反复出现此情况时，请格式化或使用其他USB。',
    },
    pianoControlError: {
      title: 'Player/Recorder Error',
      titleJa: '再生/録音エラー',
      titleZh: '无法播放或录音',
      description: 'The Player/Recorder has stopped due to an error. If this error message is shown repeatedly, please restart the piano.\nIf this error occurs repeatedly when using USB memory, please try formatting the USB memory or use a different USB memory device.',
      descriptionJa: '再生/録音処理でエラーが発生しました。再生/録音を中断します。繰り返しこのエラーが表示される場合は、電源を入れ直してください。\nUSBメモリを使用中にこのエラーが表示される場合は、フォーマットを実行するか、別のUSBメモリに交換してください。',
      descriptionZh: '无法播放或录音。停止播放或录音。如反复出现此情况时，请关闭电源后重启。\n如果在使用USB时发生此情况，请将USB格式化或使用其他USB。',
    },
    appConnectNotify: {
      title: 'App Connected',
      titleJa: 'アプリ接続中',
      titleZh: 'APP连接中',
      description: 'The piano is connected to a control app. \nTap this panel to resume control operation.',
      descriptionJa: 'ピアノとアプリが接続中です。 \nタッチパネルで操作を再開するには\n画面をタップします。',
      descriptionZh: '数码钢琴与APP正在连接中。\n可通过触屏来重新打开画面。',
    },
    usbFormatConfirm: {
      title: 'USB Memory Format',
      titleJa: 'USBメモリフォーマット',
      titleZh: 'USB格式化',
      description: 'Are you sure you would like to format the connected USB memory device? \nAll data stored on the USB memory will be deleted.',
      descriptionJa: 'USBメモリフォーマットを行いますか？ \nフォーマットを実行するとUSBメモリ内のデータが全て削除されます。',
      descriptionZh: '是否实行USB格式化？ \n格式化后USB中的数据将全部被删除。',
      label: {true:'Format', false:'Cancel'},
      labelJa: {true:'実行', false:'キャンセル'},
      labelZh: {true:'实行', false:'取消'}
    },
    usbFormatExecuting: {
      title: 'Formatting...',
      titleJa: '実行中...',
      titleZh: '实行中...',
      description: 'Formatting connected USB memory device.  Please do not remove the USB memory device or turn off the piano.',
      descriptionJa: 'USBメモリフォーマット実行中。\nピアノの電源をオフしたり、USBメモリを取り外さないでください。',
      descriptionZh: 'USB格式化实行中。\n请勿关闭数码钢琴电源或拔掉USB。',
    },
    usbFormatCompleted: {
      title: 'USB Memory Format',
      titleJa: 'USBメモリフォーマット',
      titleZh: 'USB格式化',
      description: 'USB memory device format completed.',
      descriptionJa: 'フォーマット完了。',
      descriptionZh: '格式化已完成。',
    },
    usbFormatFailed: {
      title: 'USB Memory Format',
      titleJa: 'USBメモリフォーマット',
      titleZh: 'USB格式化',
      description: 'USB memory device format failed. Please retry, or connect a different USB memory device.',
      descriptionJa: 'USBメモリフォーマットに失敗しました。\n再度実行するか、別のUSBメモリに交換してください。',
      descriptionZh: 'USB格式化失败。\n是否再次实行格式化或使用其他USB？',
    },
    noNameInput: {
      description: 'Please enter name.',
      descriptionJa: '名前を入力してください。',
      descriptionZh: '请输入名称',
    },
    songNameDuplicate: {
      description: 'Duplicate name exists.',
      descriptionJa: '重複した名前が存在します。',
      descriptionZh: '此名称已存在',
    },
    overNumOfCharacters: {
      description: 'Must be 8 characters or less.',
      descriptionJa: '8文字以下にしてください。',
      descriptionZh: '请输入8文字以内',
    },
    uiUpdateCheck: {
      description: 'UI Version Checking...',
      descriptionJa: 'UI アップデート確認中...',
      descriptionZh: 'UI更新确认中...',
    },
    uiUpdating: {
      description: 'Updating UI data...',
      descriptionJa: 'UI アップデート中...',
      descriptionZh: 'UI更新中...',
    },
    bleUpdateCheck: {
      description: 'BLE Version Checking...',
      descriptionJa: 'BLE アップデート確認中...',
      descriptionZh: 'BLE更新确认中...',
    },
    bleUpdating: {
      description: 'Updating BLE Firmware...',
      descriptionJa: 'BLE アップデート中...',
      descriptionZh: 'BLE更新中...',
    },
    identifyPiano: {
      description: 'Searching Piano...',
      descriptionJa: 'ピアノ検索中...',
      descriptionZh: '数码钢琴搜索中...',
    },
    syncPiano: {
      description: 'Syncing Piano...',
      descriptionJa: 'ピアノデータ取得中...',
      descriptionZh: '数码钢琴数据取得中...',
    },
    confirmBleUpdate: {
      title: 'BLE Firmware Update',
      titleJa: 'BLEファームウェア アップデート',
      titleZh: 'BLE固件升级',
      description: 'An updated version of the BLE (Bluetooth MIDI) firmware is available for this piano. \nIt is recommended to update to the latest BLE firmware to ensure stable communication. \nPlease do not turn off the piano while the update is in progress. \n \nWould you like to perform the BLE firmware update now? \n \nTap [Update] to update the BLE firmware, or [Cancel] to skip the update.',
      descriptionJa: 'ピアノ本体のBLE(Bluetooth MIDI)ファームウェアに最新バージョンが存在します。\n安定した通信のため、BLEファームウェアをアップデートしてください。\nアップデート中はピアノ本体の電源を切らないでください。\nアップデートを実行しますか？',
      descriptionZh: '数码钢琴的蓝牙MIDI固件有最新版本。\n为了保证通信稳定，请升级蓝牙MIDI固件。\n升级中请勿关闭数码钢琴电源。\n是否升级？',
      label: {true:'Update', false:'Cancel'},
      labelJa: {true:'アップデート', false:'キャンセル'},
      labelZh: {true:'升级', false:'取消'}
    },
    completedBleUpdate: {
      title: ' Firmware Update Complete',
      titleJa: 'BLEアップデート完了',
      titleZh: 'BLE升级完成',
      description: 'The BLE firmware has been updated successfully. \nPlease re-connect the Bluetooth MIDI device.',
      descriptionJa: 'アップデートが完了しました。\n再度BluetoothMIDI接続を行ってください。',
      descriptionZh: '已完成升级。\n请再次连接蓝牙MIDI。',
      label: 'OK',
      labelJa: 'OK',
      labelZh: 'OK'
    },
    needFirmwareUpdate: {
      title: 'Firmware Update Required',
      titleJa: 'アップデートが必要です',
      titleZh: '需要升级',
      description: 'In order to use this app, it is first necessary to update the piano\'s firmware. \n\nPlease download the latest update from the Kawai Global website:\n\nwww.kawai-global.com/updates',
      descriptionJa: 'PianoRemoteを利用するためには、ピアノ本体側のアップデートが必要です。アップデート方法は、カワイのWebサイトをご確認お願いします。',
      descriptionZh: '需要升级数码钢琴后使用PianoRemote。升级方法请参考KAWAI官网进行确认。',
      label: 'OK',
      labelJa: 'OK',
      labelZh: 'OK'
    },
    noneSupportedModel: {
      title: 'Unsupported Model',
      titleJa: '非対応モデルです',
      titleZh: '此款数码钢琴不支持此功能',
      description: 'Unfortunately, this piano does not support the PianoRemote app.\n\nPlease refer to the Kawai website for information regarding apps that do support this piano.',
      descriptionJa: 'ご利用のピアノはPianoRemoteに対応していません。カワイのWebサイトより利用可能なアプリをご確認ください。',
      descriptionZh: '此数码钢琴不支持PianoRemote。可在KAWAI官网确认可使用的APP。',
      label: 'OK',
      labelJa: 'OK',
      labelZh: 'OK'
    },
    confirmCA49Update: {
      title: 'Update Initiated',
      titleJa: 'アップデートを行います',
      titleZh: '更新',
      description: 'Update operation initiated.\n\nWould you like to continue to the piano update screen?',
      descriptionJa: '所定の操作を行いました。ピアノ本体のアップデート画面へ移動しますか？',
      descriptionZh: '操作已完成。是否返回数码钢琴更新画面？',
      label: {true:'Continue', false:'Cancel'},
      labelJa: {true:'アップデート', false:'キャンセル'},
      labelZh: {true:'升级', false:'取消'}
    },
    needAppUpdate: {
      title: 'App Update Required',
      titleJa: 'アップデートが必要です',
      titleZh: '需要升级',
      description: 'In order to take full advantage of PianoRemote\'s functions, it is necessary to update the app.\n\nPlease update PianoRemote via the device\'s app store.',
      descriptionJa: 'アプリのバージョンが古いため、一部の機能が動作しません。アプリストアでアプリのバージョンアップを行って下さい。',
      descriptionZh: 'APP非最新版本，一部分功能无法使用。请更新升级APP。',
      label: 'OK',
      labelJa: 'OK',
      labelZh: 'OK'
    },
    confirmSaveSettings: {
      title: 'Save settings to Piano',
      titleJa: 'ピアノに設定を保存',
      titleZh: '保存设置',
      description: 'Tap the [SAVE] button to save the current PianoRemote app settings to the piano\'s Startup Setting memory.',
      descriptionJa: '「保存」ボタンをタップすると、現在のアプリの設定をピアノ本体の起動時の設定として保存します。',
      descriptionZh: '点击“保存”，可将现在APP中的设定作为数码钢琴开启时的设定来进行保存。',
      label: {true:'Save', false:'Cancel'},
      labelJa: {true:'保存', false:'キャンセル'},
      labelZh: {true:'保存', false:'取消'}
    },
    progressSaveSettings: {
      title: 'Saving to Piano',
      titleJa: '保存中',
      titleZh: '保存中',
      description: 'Saving data.\n\nPlease do not turn off the instrument\'s power.',
      descriptionJa: '保存中。\n電源をオフしないで下さい。',
      descriptionZh: '保存中。\n请勿关闭电源。',
    },
    completeSaveSettings: {
      title: 'Saving Complete',
      titleJa: '保存完了',
      titleZh: '保存完成',
      description: 'Saving completed.\n\nThe current PianoRemote app settings will now be used as the default settings every time the piano is turned on.',
      descriptionJa: '保存を完了しました。次回、ピアノ本体の起動する時は現在のアプリの設定で起動します。',
      descriptionZh: '保存已完成。下次可通过APP的设定来开启数码钢琴。',
      label: 'OK',
      labelJa: 'OK',
      labelZh: 'OK'
    },
    bleIsUnavailable: {
      title: 'Bluetooth Error',
      titleJa: 'Bluetooth設定エラー',
      titleZh: '蓝牙设定失败',
      description: 'Bluetooth function is not available. Please ensure that your smart device\'s Bluetooth function is enabled. \n In case of Android, please ensure that the device\'s Location function is also enabled, and that both Location and Storage permission requests are approved.\n After changing these settings, please restart the PianoRemote app.',
      descriptionJa: 'Bluetooth機能が無効になっています。\n お使いのスマートデバイスのBluetooth設定がONになっている事を確認して下さい。\n Androidデバイスの場合は、位置情報サービス機能がONになっていること、\n アプリ設定の位置情報へのアクセス権限が許可されている事を確認してください。\n 設定変更後、本アプリを再起動してください。',
      descriptionZh: '蓝牙功能无效。\n 请确认正在使用的智能设备中的蓝牙设定是否开启。\n 安卓设备，如果开启位置信息功能，\n 请确认是否已允许APP设定的位置信息读取权限。\n设定变更后，请再次开启APP。',
    },
    needScanQrCode: {
      description: 'Scan the QR code with your smart device to view the online manual.\nOr tap this panel to resume normal operation.',
      descriptionJa: 'お持ちのスマートデバイスでQRコードを読み取ると、オンラインマニュアルを確認することができます。\nタッチパネルで操作を再開するには画面をタップします。',
      descriptionZh: '使用智能设备读取二维码后，可查阅线上使用说明书。\n可通过触屏来重新打开画面。'
    },
    powerConsumptionNotify: {
      title: 'About Power Consumption',
      titleJa: '消費電力が大きくなります',
      titleZh:'耗电量变大',
      description: 'Please note that changing the Auto Power Off setting to "60 Minutes", "120 Minutes", or "Never" may increase the instrument\'s power consumption.\nTo reduce the instrument\'s power consumption, it is recommended to set the Auto Power Off setting to "15 Minutes".',
      descriptionJa: 'オートパワーオフで電源を切る時間を「オフ」「60分」「120分」に設定すると、ピアノ本体の消費電力が大きくなる場合があります。\n消費電力を抑えたい場合は、オートパワーオフで電源を切る時間を「15分」に設定してください。',
      descriptionZh:'当电源自动关闭的设置时间为“60分钟”或“120分钟”时，数码钢琴的耗电量将会变大。\n如需要环保省电，可将电源自动关闭的设置调节为“15分钟”即可。',
    },
    demoModeNotify: {
      title: 'About Demo Mode',
      titleJa: 'デモモードについて',
      titleZh:'关于演示模式',
      description: 'PianoRemote is now running in Demo mode.\nThe app will simulate the experience of controlling a CA901 digital piano.\nPlease note that when connected to a compatible Kawai instrument, PianoRemote will adjust to show the available sounds, features, and settings for the connected model.',
      descriptionJa: 'デモモードではCA901と接続した状態を表示します。\n接続するピアノの機種に応じて、音色や設定の表示内容、機能が異なる場合があります。',
      descriptionZh:'演示模式将显示与CA901数码钢琴的链接状态。\n由于链接的数码钢琴型号不同，所以音色、设定的显示内容，以及功能都会有所不同。',
    },
    demoModeNotifyForSCA: {
      title: 'About Demo Mode',
      titleJa: 'デモモードについて',
      titleZh:'关于演示模式',
      description: 'PianoRemote is now running in Demo mode.\nThe app will simulate the experience of controlling a SCA901 digital piano.\nPlease note that when connected to a compatible Kawai instrument, PianoRemote will adjust to show the available sounds, features, and settings for the connected model.',
      descriptionJa: 'デモモードではSCA901と接続した状態を表示します。\n接続するピアノの機種に応じて、音色や設定の表示内容、機能が異なる場合があります。',
      descriptionZh:'演示模式将显示与SCA901数码钢琴的链接状态。\n由于链接的数码钢琴型号不同，所以音色、设定的显示内容，以及功能都会有所不同。',
    }
  }
}