type Profile = {
  id: string;
  source: any;
};

export const profile: Profile[] = [
  { id: 'profile1', source: require('../assets/images/child-avatars/profile1.png') },
  { id: 'profile2', source: require('../assets/images/child-avatars/profile2.png') },
  { id: 'profile3', source: require('../assets/images/child-avatars/profile3.png') },
  { id: 'profile4', source: require('../assets/images/child-avatars/profile4.png') },
];

export const getProfileFromId = (id: string) => {
    
    switch (id) {
      case 'profile1':
        return require('../assets/images/child-avatars/profile1.png');
      case 'profile2':
        return require('../assets/images/child-avatars/profile2.png');
      case 'profile3':
        return require('../assets/images/child-avatars/profile3.png');
      case 'profile4':
        return require('../assets/images/child-avatars/profile4.png');
      default:
        return require('../assets/images/child-avatars/profile1.png');
    }
  };
  
  type Animal = {
      name: string;
      source: any;
  };
  
  export const animals = [
    {
      name: 'Vixie',
      source: require('../assets/images/child-avatars/vixie.png'),
      sound: require('../assets/sounds/vixie.mp3'),
    },
    {
      name: 'Paddy',
      source: require('../assets/images/child-avatars/paddy.png'),
      sound: require('../assets/sounds/paddy.mp3'),
    },
    {
      name: 'Bumble',
      source: require('../assets/images/child-avatars/bumble.png'),
      sound: require('../assets/sounds/bumble.mp3'),
    },
    {
      name: 'Skye',
      source: require('../assets/images/child-avatars/skye.png'),
      sound: require('../assets/sounds/skye.mp3'),
    },
  ];
  
  export const avatarMap: Record<string, any> = {
    Skye: require('../assets/images/child-avatars/skye-popup_png.png'),
    Bumble: require('../assets/images/child-avatars/bumble-popup_png.png'),
    Paddy: require('../assets/images/child-avatars/paddy-popup_png.png'),
    Vixie: require('../assets/images/child-avatars/vixie-popup_png.png')
    // Add other avatars as needed
  };

  export const avatarAnimatedMap: Record<string, any> = {
    Skye: require('../assets/images/child-avatars/skye-popup.gif'),
    Bumble: require('../assets/images/child-avatars/bumble-popup.gif'),
    Paddy: require('../assets/images/child-avatars/paddy-popup.gif'),
    Vixie: require('../assets/images/child-avatars/vixie-popup.gif')
    // Add other avatars as needed
  };