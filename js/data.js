// Burger Garage - Data Source
const MENU_DATA = {
  categories: ['Burger', 'Pizza', 'Drinks', 'Fries', 'Others'],

  cities: [
    { name: 'Gujranwala', areas: ['Rahwali', 'Gujranwala City', 'Sialkot Road'] },
    { name: 'Daska', areas: ['Daska Main', 'College Road', 'Khadim Ali Road'] },
    { name: 'Wazirabad', areas: ['Wazirabad Cantt', 'Main Bazar', 'Station Road'] }
  ],

  deals: [
    {
      id: 'deal-1',
      title: 'Summer Deal',
      tag: '🔥 25% OFF',
      description: '2 Smalls or 2 Larges or 2 Mediums',
      price: 1899,
      originalPrice: 2450,
      image: 'assets/piza deal.jpg'
    },
    {
      id: 'deal-2',
      title: 'Summer solo',
      tag: '⚡ Popular',
      description: '1 Small pizza/1 Nr/2 peices wings',
      price: 748,
      originalPrice: 1650,
      image: 'assets/deal2.jpg'
    },
    {
      id: 'deal-3',
      title: 'Mega Garage Combo',
      tag: '⭐ Best Value',
      description: '1 Large Pizza + 1 Zinger Burger + 1 28 Wheeler Wrap + Wings (8 Pcs)',
      price: 2499,
      originalPrice: 3100,
      image: 'assets/de.jpg'
    }
  ],

  // Products are now loaded dynamically from Firebase Firestore.
  // Admin adds all products via the Admin Panel — no static products here.
  products: [],

  outlets: [
    {
      id: 'outlet-rahwali',
      name: 'Rahwali Cantt',
      city: 'Gujranwala',
      address: 'Main GT Road, Near Rahwali Cantt Gate, Gujranwala',
      phone: '0300-1234567',
      timing: '11:00 AM - 01:00 AM',
      lat: 32.2411,
      lng: 74.1654,
      image: 'assets/logoo.jpg'
    },
    {
      id: 'outlet-gujranwala',
      name: 'Gujranwala City',
      city: 'Gujranwala',
      address: 'Model Town Food Street, Near Kings Mall, Gujranwala',
      phone: '0301-7654321',
      timing: '12:00 PM - 02:00 AM',
      lat: 32.1494,
      lng: 74.1916,
      image: 'assets/logoo.jpg'
    },
    {
      id: 'outlet-sialkot-rd',
      name: 'Sialkot Road',
      city: 'Gujranwala',
      address: 'Main Sialkot Road, Near Gift University bypass, Gujranwala',
      phone: '0302-3456789',
      timing: '11:00 AM - 12:00 AM',
      lat: 32.1866,
      lng: 74.2076,
      image: 'assets/logoo.jpg'
    },
    {
      id: 'outlet-daska',
      name: 'Daska City',
      city: 'Daska',
      address: 'College Road, Opp. Civil Hospital, Daska',
      phone: '0303-9876543',
      timing: '11:00 AM - 12:00 AM',
      lat: 32.3423,
      lng: 74.3545,
      image: 'assets/logoo.jpg'
    },
    {
      id: 'outlet-wazirabad',
      name: 'Wazirabad City',
      city: 'Wazirabad',
      address: 'Katchery Road, Near Railway Station, Wazirabad',
      phone: '0304-5556677',
      timing: '11:00 AM - 11:30 PM',
      lat: 32.4432,
      lng: 74.1249,
      image: 'assets/logoo.jpg'
    }
  ]
};
