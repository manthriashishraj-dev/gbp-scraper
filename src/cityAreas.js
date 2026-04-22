/**
 * cityAreas.js
 *
 * Maps every major Indian city to ALL its constituent areas, neighbourhoods,
 * and merged towns — organized by Tier 1 / Tier 2 / Tier 3.
 *
 * Why this matters:
 *   A business in Hanamkonda (part of Warangal) won't appear in
 *   "dentist in Warangal" because its GMB address says "Hanamkonda".
 *   This mapping auto-generates one query per area so nothing is missed.
 *
 * Keys are lowercase. Matching is case-insensitive.
 */

// ════════════════════════════════════════════════════════════════════
//  TIER CLASSIFICATION  (used to filter/group cities in the UI)
// ════════════════════════════════════════════════════════════════════
export const CITY_TIER = {
  // Tier 1 — Metro cities
  mumbai: 1, delhi: 1, bengaluru: 1, bangalore: 1,
  hyderabad: 1, chennai: 1, kolkata: 1, pune: 1, ahmedabad: 1,

  // Tier 2 — Large cities
  jaipur: 2, lucknow: 2, surat: 2, kanpur: 2, nagpur: 2,
  indore: 2, bhopal: 2, visakhapatnam: 2, vizag: 2, patna: 2,
  vadodara: 2, ludhiana: 2, agra: 2, nashik: 2, faridabad: 2,
  meerut: 2, rajkot: 2, varanasi: 2, aurangabad: 2, amritsar: 2,
  prayagraj: 2, allahabad: 2, ranchi: 2, coimbatore: 2, jabalpur: 2,
  gwalior: 2, vijayawada: 2, jodhpur: 2, madurai: 2, raipur: 2,
  kota: 2, chandigarh: 2, guwahati: 2, solapur: 2, mysuru: 2,
  mysore: 2, thiruvananthapuram: 2, trivandrum: 2, kochi: 2, cochin: 2,
  bhubaneswar: 2, bareilly: 2, moradabad: 2, tirupati: 2, trichy: 2,
  tiruchirappalli: 2, hubli: 2, belgaum: 2, belagavi: 2, mangalore: 2,
  mangaluru: 2, salem: 2, tirunelveli: 2, vellore: 2, guntur: 2,
  nellore: 2, kurnool: 2, warangal: 3,  // Warangal is Tier 3 in AP/TG context

  // Tier 3 — District/smaller cities
  karimnagar: 3, nizamabad: 3, khammam: 3, nalgonda: 3, mahbubnagar: 3,
  medchal: 3, sangareddy: 3, suryapet: 3, miryalaguda: 3, bhongir: 3,
  nandyal: 3, adoni: 3, anantapur: 3, kadapa: 3, chittoor: 3,
  srikakulam: 3, vizianagaram: 3, eluru: 3, rajahmundry: 3, kakinada: 3,
  ongole: 3, proddatur: 3, hindupur: 3, dharmavaram: 3, guntakal: 3,
  shimoga: 3, davangere: 3, tumkur: 3, raichur: 3, gulbarga: 3,
  bijapur: 3, hospet: 3, bellary: 3, bidar: 3,
};

// ════════════════════════════════════════════════════════════════════
//  CITY → AREAS MAPPING
// ════════════════════════════════════════════════════════════════════
export const CITY_AREAS = {

  // ──────────────────────────────────────────────────────────────
  //  TIER 1 — METRO CITIES
  // ──────────────────────────────────────────────────────────────

  // MUMBAI (Maharashtra)
  mumbai: [
    'Bandra Mumbai', 'Andheri West Mumbai', 'Andheri East Mumbai',
    'Borivali Mumbai', 'Malad Mumbai', 'Goregaon Mumbai', 'Kandivali Mumbai',
    'Dahisar Mumbai', 'Mira Road Mumbai', 'Vasai Mumbai', 'Virar Mumbai',
    'Thane', 'Navi Mumbai', 'Kharghar Navi Mumbai', 'Vashi Navi Mumbai',
    'Belapur Navi Mumbai', 'Panvel Navi Mumbai',
    'Chembur Mumbai', 'Ghatkopar Mumbai', 'Vikhroli Mumbai',
    'Mulund Mumbai', 'Bhandup Mumbai', 'Powai Mumbai',
    'Juhu Mumbai', 'Versova Mumbai', 'Santacruz Mumbai',
    'Dadar Mumbai', 'Parel Mumbai', 'Worli Mumbai',
    'Lower Parel Mumbai', 'Colaba Mumbai', 'Fort Mumbai',
    'Churchgate Mumbai', 'Kurla Mumbai', 'Sakinaka Mumbai',
    'Jogeshwari Mumbai', 'Oshiwara Mumbai', 'Lokhandwala Mumbai',
  ],

  // DELHI / NCR
  delhi: [
    'Connaught Place Delhi', 'Karol Bagh Delhi', 'Lajpat Nagar Delhi',
    'South Extension Delhi', 'Greater Kailash Delhi', 'Defence Colony Delhi',
    'Vasant Kunj Delhi', 'Dwarka Delhi', 'Rohini Delhi', 'Pitampura Delhi',
    'Janakpuri Delhi', 'Rajouri Garden Delhi', 'Preet Vihar Delhi',
    'Mayur Vihar Delhi', 'Laxmi Nagar Delhi', 'Dilshad Garden Delhi',
    'Shahdara Delhi', 'Saket Delhi', 'Malviya Nagar Delhi',
    'Hauz Khas Delhi', 'Munirka Delhi', 'Nehru Place Delhi',
    'Noida', 'Greater Noida', 'Gurgaon', 'Gurugram',
    'Faridabad', 'Ghaziabad', 'Indirapuram Ghaziabad',
    'Vaishali Ghaziabad', 'Sohna Road Gurgaon', 'DLF Phase Gurgaon',
    'Sector 14 Gurgaon', 'Sector 56 Gurgaon', 'Sector 18 Noida',
    'Sector 62 Noida', 'Sector 50 Noida', 'Sector 137 Noida',
  ],

  // BENGALURU / BANGALORE (Karnataka)
  bengaluru: [
    'Koramangala Bangalore', 'Indiranagar Bangalore', 'Whitefield Bangalore',
    'Electronic City Bangalore', 'Jayanagar Bangalore', 'JP Nagar Bangalore',
    'Bannerghatta Road Bangalore', 'HSR Layout Bangalore', 'BTM Layout Bangalore',
    'Marathahalli Bangalore', 'Sarjapur Road Bangalore', 'Yelahanka Bangalore',
    'Hebbal Bangalore', 'Malleshwaram Bangalore', 'Rajajinagar Bangalore',
    'Basavanagudi Bangalore', 'RT Nagar Bangalore', 'Nagarbhavi Bangalore',
    'Kengeri Bangalore', 'Vijayanagar Bangalore', 'Yeshwantpur Bangalore',
    'Peenya Bangalore', 'Dasarahalli Bangalore', 'RR Nagar Bangalore',
    'Kanakapura Road Bangalore', 'Banashankari Bangalore',
    'Wilson Garden Bangalore', 'Richmond Town Bangalore',
    'MG Road Bangalore', 'Lavelle Road Bangalore',
    'Bellandur Bangalore', 'Devanahalli Bangalore',
    'Domlur Bangalore', 'Old Airport Road Bangalore',
    'KR Puram Bangalore', 'Hennur Bangalore', 'Thanisandra Bangalore',
  ],
  bangalore: null, // alias — resolved in getAreasForCity

  // HYDERABAD (Telangana)
  hyderabad: [
    // West / HITEC corridor
    'Banjara Hills Hyderabad', 'Jubilee Hills Hyderabad',
    'Kukatpally Hyderabad', 'Hitech City Hyderabad',
    'Madhapur Hyderabad', 'Kondapur Hyderabad', 'Gachibowli Hyderabad',
    'Serilingampally Hyderabad', 'Nanakramguda Hyderabad', 'Manikonda Hyderabad',
    'Kokapet Hyderabad', 'Narsingi Hyderabad', 'Tellapur Hyderabad',
    'Nallagandla Hyderabad', 'Chandanagar Hyderabad', 'Lingampally Hyderabad',
    'Nizampet Hyderabad', 'Pragathi Nagar Hyderabad', 'Bachupally Hyderabad',
    'Miyapur Hyderabad', 'Patancheru Hyderabad',
    // Central
    'Ameerpet Hyderabad', 'Begumpet Hyderabad', 'SR Nagar Hyderabad',
    'Punjagutta Hyderabad', 'Somajiguda Hyderabad', 'Khairatabad Hyderabad',
    'Lakdikapul Hyderabad', 'Basheerbagh Hyderabad', 'Himayatnagar Hyderabad',
    'Nampally Hyderabad', 'Abids Hyderabad', 'Koti Hyderabad',
    'Sultan Bazar Hyderabad', 'Musheerabad Hyderabad', 'Amberpet Hyderabad',
    'Narayanguda Hyderabad', 'Tilak Nagar Hyderabad',
    'Sanathnagar Hyderabad', 'Moosapet Hyderabad', 'Erragadda Hyderabad',
    'Borabanda Hyderabad', 'Yousufguda Hyderabad', 'Film Nagar Hyderabad',
    // North / Secunderabad cantonment
    'Secunderabad', 'Bowenpally Hyderabad', 'Trimulgherry Hyderabad',
    'Alwal Hyderabad', 'Sainikpuri Hyderabad', 'Malkajgiri Hyderabad',
    'Neredmet Hyderabad', 'Kakaguda Hyderabad', 'Tarnaka Hyderabad',
    'Habsiguda Hyderabad', 'Nacharam Hyderabad', 'Uppal Hyderabad',
    'ECIL Hyderabad', 'AS Rao Nagar Hyderabad', 'Kapra Hyderabad',
    'Defence Colony Hyderabad', 'Kompally Hyderabad', 'Medchal Hyderabad',
    'Shamirpet Hyderabad', 'Bahadurpally Hyderabad', 'Quthbullapur Hyderabad',
    'Jeedimetla Hyderabad', 'Suchitra Circle Hyderabad',
    // East
    'Dilsukhnagar Hyderabad', 'Kothapet Hyderabad', 'LB Nagar Hyderabad',
    'Saroornagar Hyderabad', 'Chaitanyapuri Hyderabad', 'Boduppal Hyderabad',
    'Nagole Hyderabad', 'Vanasthalipuram Hyderabad', 'Hayathnagar Hyderabad',
    'Ghatkesar Hyderabad', 'Pocharam Hyderabad', 'Keesara Hyderabad',
    // South
    'Mehdipatnam Hyderabad', 'Tolichowki Hyderabad', 'Attapur Hyderabad',
    'Rajendranagar Hyderabad', 'Shamshabad Hyderabad', 'Aramghar Hyderabad',
    'Upparpally Hyderabad', 'Kishanbagh Hyderabad',
    'Malakpet Hyderabad', 'Charminar Hyderabad', 'Dabeerpura Hyderabad',
    'Chandrayangutta Hyderabad', 'Falaknuma Hyderabad', 'Saidabad Hyderabad',
    'Barkas Hyderabad', 'Kanchanbagh Hyderabad', 'Santoshnagar Hyderabad',
    'Old City Hyderabad',
    // South-West outskirts (Gandipet / Hydershakote belt)
    'Hydershakote Hyderabad', 'Hyder Shah Kote Hyderabad',
    'Gandipet Hyderabad', 'Puppalaguda Hyderabad',
    'Financial District Hyderabad', 'Wipro Circle Hyderabad',
    'Osman Nagar Hyderabad', 'Bandlaguda Jagir Hyderabad',
    'Bandlaguda Hyderabad', 'Nehru Nagar Hyderabad',
    'Rajendra Nagar Hyderabad', 'Katedan Hyderabad',
    'Langar Houz Hyderabad', 'Tattiannaram Hyderabad',
    'Moinabad Hyderabad', 'Chevella Hyderabad',
    // Additional tech corridor / outer ring
    'Kollur Hyderabad', 'Tellapur Hyderabad',
    'Mokila Hyderabad', 'ISB Hyderabad',
    'DLF Hyderabad', 'Knowledge City Hyderabad',
    'Cyber Towers Hyderabad', 'Raidurg Hyderabad',
    'Khajaguda Hyderabad', 'Puppalguda Hyderabad',
  ],

  // SECUNDERABAD (twin city of Hyderabad — has distinct local areas)
  secunderabad: [
    'Secunderabad', 'Trimulgherry Secunderabad', 'Bowenpally Secunderabad',
    'Alwal Secunderabad', 'Sainikpuri Secunderabad', 'Malkajgiri Secunderabad',
    'Tarnaka Secunderabad', 'Habsiguda Secunderabad', 'Neredmet Secunderabad',
    'Kakaguda Secunderabad', 'Marredpally Secunderabad',
    'West Marredpally Secunderabad', 'East Marredpally Secunderabad',
    'Karkhana Secunderabad', 'Mettuguda Secunderabad', 'Boiguda Secunderabad',
    'Minister Road Secunderabad', 'SD Road Secunderabad',
    'Paradise Secunderabad', 'Rasoolpura Secunderabad',
    'Begumpet Secunderabad', 'Monda Market Secunderabad',
    'AOC Centre Secunderabad', 'Trimulgherry Cantonment Secunderabad',
    'Bolarum Secunderabad', 'Picket Secunderabad',
  ],

  // CHENNAI (Tamil Nadu)
  chennai: [
    'Anna Nagar Chennai', 'Adyar Chennai', 'Velachery Chennai',
    'Tambaram Chennai', 'Porur Chennai', 'Chromepet Chennai',
    'Perambur Chennai', 'Nungambakkam Chennai', 'T Nagar Chennai',
    'Mylapore Chennai', 'Kilpauk Chennai', 'Egmore Chennai',
    'Ambattur Chennai', 'Avadi Chennai', 'Poonamallee Chennai',
    'Madipakkam Chennai', 'Sholinganallur Chennai', 'Perungudi Chennai',
    'OMR Chennai', 'ECR Chennai', 'Kelambakkam Chennai',
    'Maraimalai Nagar Chennai', 'Pallavaram Chennai',
    'Medavakkam Chennai', 'Perungalathur Chennai',
    'Guduvanchery Chennai', 'Pammal Chennai',
    'Valasaravakkam Chennai', 'Mogappair Chennai',
    'Kolathur Chennai', 'Villivakkam Chennai',
  ],

  // KOLKATA (West Bengal)
  kolkata: [
    'Park Street Kolkata', 'Salt Lake City Kolkata',
    'New Town Kolkata', 'Howrah', 'Dum Dum Kolkata',
    'Barasat Kolkata', 'Rajarhat Kolkata', 'Jadavpur Kolkata',
    'Tollygunge Kolkata', 'Behala Kolkata', 'Alipore Kolkata',
    'Dhakuria Kolkata', 'Gariahat Kolkata', 'Ballygunge Kolkata',
    'VIP Road Kolkata', 'Lake Town Kolkata',
    'Kasba Kolkata', 'Phool Bagan Kolkata',
    'Entally Kolkata', 'Shyambazar Kolkata',
    'Belgachia Kolkata', 'Sinthee Kolkata',
    'Baghajatin Kolkata', 'Garia Kolkata',
    'Sonarpur Kolkata', 'Narendrapur Kolkata',
    'Barrackpore Kolkata', 'Serampore Kolkata',
    'Chandannagar Kolkata', 'Dankuni Kolkata',
  ],

  // PUNE (Maharashtra)
  pune: [
    'Koregaon Park Pune', 'Baner Pune', 'Wakad Pune',
    'Hinjewadi Pune', 'Kothrud Pune', 'Hadapsar Pune',
    'Magarpatta Pune', 'Viman Nagar Pune', 'Aundh Pune',
    'Pimpri Pune', 'Chinchwad Pune', 'Deccan Pune',
    'Camp Pune', 'Kalyani Nagar Pune', 'Wanowrie Pune',
    'Kharadi Pune', 'Mundhwa Pune', 'NIBM Road Pune',
    'Kondhwa Pune', 'Sus Road Pune', 'Balewadi Pune',
    'Pashan Pune', 'Sinhagad Road Pune', 'Katraj Pune',
    'Undri Pune', 'Wagholi Pune', 'Bhosari Pune',
    'Yerwada Pune', 'Sangvi Pune', 'Vishrantwadi Pune',
    'Lohegaon Pune', 'Dhanori Pune', 'Wadgaonsheri Pune',
  ],

  // AHMEDABAD (Gujarat)
  ahmedabad: [
    'SG Road Ahmedabad', 'Navrangpura Ahmedabad', 'Satellite Ahmedabad',
    'Bodakdev Ahmedabad', 'Thaltej Ahmedabad', 'Vastrapur Ahmedabad',
    'Paldi Ahmedabad', 'Maninagar Ahmedabad', 'Ghatlodia Ahmedabad',
    'Chandkheda Ahmedabad', 'Bopal Ahmedabad', 'South Bopal Ahmedabad',
    'Prahlad Nagar Ahmedabad', 'CG Road Ahmedabad',
    'Ambawadi Ahmedabad', 'Naranpura Ahmedabad',
    'Nikol Ahmedabad', 'Naroda Ahmedabad', 'Vastral Ahmedabad',
    'Odhav Ahmedabad', 'Vatva Ahmedabad', 'Isanpur Ahmedabad',
    'Bapunagar Ahmedabad', 'Gomtipur Ahmedabad',
    'Rakhial Ahmedabad', 'Saraspur Ahmedabad',
    'New Ranip Ahmedabad', 'Gota Ahmedabad', 'Motera Ahmedabad',
    'Sabarmati Ahmedabad', 'Nava Vadaj Ahmedabad',
    'Gandhinagar', 'Sanand Ahmedabad',
  ],

  // ──────────────────────────────────────────────────────────────
  //  TIER 2 — LARGE CITIES
  // ──────────────────────────────────────────────────────────────

  // JAIPUR (Rajasthan)
  jaipur: [
    'Malviya Nagar Jaipur', 'Vaishali Nagar Jaipur', 'Mansarovar Jaipur',
    'Jagatpura Jaipur', 'Tonk Road Jaipur', 'Ajmer Road Jaipur',
    'Sikar Road Jaipur', 'Sanganer Jaipur', 'Murlipura Jaipur',
    'Nirman Nagar Jaipur', 'Raja Park Jaipur', 'Civil Lines Jaipur',
    'C Scheme Jaipur', 'Bani Park Jaipur', 'Sodala Jaipur',
    'Shastri Nagar Jaipur', 'Pratap Nagar Jaipur',
    'Sitapura Jaipur', 'Kartarpura Jaipur',
  ],

  // LUCKNOW (Uttar Pradesh)
  lucknow: [
    'Gomti Nagar Lucknow', 'Hazratganj Lucknow', 'Indira Nagar Lucknow',
    'Aliganj Lucknow', 'Vikas Nagar Lucknow', 'Alambagh Lucknow',
    'Chowk Lucknow', 'Aminabad Lucknow', 'Mahanagar Lucknow',
    'Rajajipuram Lucknow', 'Chinhat Lucknow', 'Faizabad Road Lucknow',
    'Kanpur Road Lucknow', 'Sultanpur Road Lucknow',
    'Jankipuram Lucknow', 'Vrindavan Yojana Lucknow',
    'Sushant Golf City Lucknow',
  ],

  // SURAT (Gujarat)
  surat: [
    'Adajan Surat', 'Vesu Surat', 'Piplod Surat',
    'Pal Surat', 'Katargam Surat', 'Varachha Surat',
    'Udhna Surat', 'Rander Surat', 'Althan Surat',
    'Citylight Surat', 'Athwa Surat', 'Ring Road Surat',
    'Bhestan Surat', 'Dumas Surat', 'Sachin Surat',
  ],

  // NAGPUR (Maharashtra)
  nagpur: [
    'Dharampeth Nagpur', 'Ramdaspeth Nagpur', 'Civil Lines Nagpur',
    'Sitabuldi Nagpur', 'Sadar Nagpur', 'Gandhibagh Nagpur',
    'Itwari Nagpur', 'Pratap Nagar Nagpur', 'Manish Nagar Nagpur',
    'Bajaj Nagar Nagpur', 'Trimurti Nagar Nagpur',
    'Hingna Road Nagpur', 'Wardha Road Nagpur',
    'Amravati Road Nagpur', 'Katol Road Nagpur',
    'Kalamna Nagpur', 'Besa Nagpur', 'Wathoda Nagpur',
  ],

  // INDORE (Madhya Pradesh)
  indore: [
    'Vijay Nagar Indore', 'Palasia Indore', 'MG Road Indore',
    'Scheme 54 Indore', 'South Tukoganj Indore', 'Sapna Sangeeta Indore',
    'AB Road Indore', 'LIG Colony Indore', 'Lasudia Mori Indore',
    'Rau Indore', 'Bhicholi Mardana Indore', 'Nipania Indore',
    'Khandwa Road Indore', 'Dhar Road Indore',
    'Geeta Bhawan Indore', 'Annapurna Road Indore',
  ],

  // BHOPAL (Madhya Pradesh)
  bhopal: [
    'MP Nagar Bhopal', 'Arera Colony Bhopal', 'Hoshangabad Road Bhopal',
    'Kolar Road Bhopal', 'Awadhpuri Bhopal', 'Shahpura Bhopal',
    'Misrod Bhopal', 'Berasia Road Bhopal', 'Ayodhya Bypass Bhopal',
    'Raisen Road Bhopal', 'TT Nagar Bhopal', 'New Market Bhopal',
    'Bittan Market Bhopal', 'Gulmohar Bhopal',
  ],

  // VISAKHAPATNAM / VIZAG (Andhra Pradesh)
  visakhapatnam: [
    'Visakhapatnam', 'MVP Colony Visakhapatnam', 'Dwaraka Nagar Visakhapatnam',
    'Steel Plant Visakhapatnam', 'Gajuwaka Visakhapatnam',
    'Bheemunipatnam Visakhapatnam', 'Rushikonda Visakhapatnam',
    'Madhurawada Visakhapatnam', 'Seethammadhara Visakhapatnam',
    'Akkayyapalem Visakhapatnam', 'Pendurthi Visakhapatnam',
    'Kommadi Visakhapatnam', 'Anakapalle Visakhapatnam',
    'Bhimili Visakhapatnam', 'Gopalapatnam Visakhapatnam',
    'Marripalem Visakhapatnam', 'Simhachalam Visakhapatnam',
    'Waltair Visakhapatnam', 'Maddilapalem Visakhapatnam',
  ],
  vizag: null, // alias

  // VIJAYAWADA (Andhra Pradesh)
  vijayawada: [
    'Vijayawada', 'Benz Circle Vijayawada', 'One Town Vijayawada',
    'Governorpet Vijayawada', 'Patamata Vijayawada',
    'Moghalrajpuram Vijayawada', 'Krishna Lanka Vijayawada',
    'Labbipet Vijayawada', 'MG Road Vijayawada',
    'Siddhartha Nagar Vijayawada', 'Machavaram Vijayawada',
    'Autonagar Vijayawada', 'Gunadala Vijayawada',
    'Kanuru Vijayawada', 'Gollapudi Vijayawada',
    'Gannavaram Vijayawada', 'Ibrahimpatnam Vijayawada',
    'Mylavaram Vijayawada', 'Vuyyuru Vijayawada',
    'Nandigama Vijayawada',
  ],

  // PATNA (Bihar)
  patna: [
    'Boring Road Patna', 'Kankarbagh Patna', 'Rajendra Nagar Patna',
    'Patliputra Patna', 'Anisabad Patna', 'Ashok Rajpath Patna',
    'Bailey Road Patna', 'Fraser Road Patna', 'Gandhi Maidan Patna',
    'Kurji Patna', 'Phulwari Patna', 'Danapur Patna',
    'Rupaspur Patna', 'Saguna More Patna',
  ],

  // VADODARA (Gujarat)
  vadodara: [
    'Alkapuri Vadodara', 'Fatehgunj Vadodara', 'Gotri Vadodara',
    'Vasna Road Vadodara', 'Nizampura Vadodara', 'Waghodia Road Vadodara',
    'Manjalpur Vadodara', 'Karelibaug Vadodara', 'Productivity Road Vadodara',
    'Sayajigunj Vadodara', 'Racecourse Vadodara',
  ],

  // COIMBATORE (Tamil Nadu)
  coimbatore: [
    'RS Puram Coimbatore', 'Peelamedu Coimbatore', 'Ganapathy Coimbatore',
    'Saibaba Colony Coimbatore', 'Singanallur Coimbatore',
    'Hopes College Coimbatore', 'Race Course Coimbatore',
    'Gandhipuram Coimbatore', 'Ukkadam Coimbatore',
    'Ondipudur Coimbatore', 'Vadavalli Coimbatore',
    'Kuniyamuthur Coimbatore', 'Thudiyalur Coimbatore',
    'Saravanampatti Coimbatore', 'Sulur Coimbatore',
    'Pollachi Coimbatore', 'Mettupalayam Coimbatore',
  ],

  // KOCHI / COCHIN (Kerala)
  kochi: [
    'Ernakulam Kochi', 'Edapally Kochi', 'Kakkanad Kochi',
    'Aluva Kochi', 'Perumbavoor Kochi', 'Angamaly Kochi',
    'Thrippunithura Kochi', 'Tripunithura Kochi',
    'Kalamassery Kochi', 'Maradu Kochi', 'Vyttila Kochi',
    'Panampilly Nagar Kochi', 'Marine Drive Kochi',
    'Mattancherry Kochi', 'Fort Kochi',
    'Palarivattom Kochi', 'Kaloor Kochi',
    'MG Road Kochi', 'Broadway Kochi',
  ],
  cochin: null, // alias

  // CHANDIGARH (UT)
  chandigarh: [
    'Sector 17 Chandigarh', 'Sector 22 Chandigarh', 'Sector 35 Chandigarh',
    'Sector 26 Chandigarh', 'Sector 34 Chandigarh', 'Sector 43 Chandigarh',
    'Sector 44 Chandigarh', 'Mohali', 'Panchkula',
    'Zirakpur', 'Derabassi', 'Kharar',
  ],

  // VARANASI (Uttar Pradesh)
  varanasi: [
    'Sigra Varanasi', 'Lanka Varanasi', 'Assi Ghat Varanasi',
    'Godowlia Varanasi', 'Nadesar Varanasi', 'Cantonment Varanasi',
    'Sarnath Varanasi', 'Bhelupur Varanasi', 'Shivpur Varanasi',
    'Rohania Varanasi', 'Sundarpur Varanasi', 'Pandeypur Varanasi',
  ],

  // MADURAI (Tamil Nadu)
  madurai: [
    'Anna Nagar Madurai', 'KK Nagar Madurai', 'Tallakulam Madurai',
    'Krishnasamy Nagar Madurai', 'Vilangudi Madurai',
    'Nagamalai Madurai', 'Thirunagar Madurai',
    'Alagar Kovil Road Madurai', 'Melur Madurai',
    'Paravai Madurai', 'Tirupparankundram Madurai',
  ],

  // MYSURU / MYSORE (Karnataka)
  mysuru: [
    'Saraswathipuram Mysore', 'Kuvempunagar Mysore',
    'Vijayanagar Mysore', 'Hebbal Mysore', 'Gokulam Mysore',
    'Jayalakshmipuram Mysore', 'Siddartha Layout Mysore',
    'Bogadi Mysore', 'Dattagalli Mysore', 'Nanjangud Mysore',
    'Hunsur Mysore', 'Srirangapatna Mysore',
  ],
  mysore: null, // alias

  // THIRUVANANTHAPURAM / TRIVANDRUM (Kerala)
  thiruvananthapuram: [
    'Pattom Thiruvananthapuram', 'Kowdiar Thiruvananthapuram',
    'Vazhuthacaud Thiruvananthapuram', 'Palayam Thiruvananthapuram',
    'Medical College Thiruvananthapuram', 'Vellayambalam Thiruvananthapuram',
    'Kazhakuttam Thiruvananthapuram', 'Technopark Thiruvananthapuram',
    'Nemom Thiruvananthapuram', 'Sreekaryam Thiruvananthapuram',
    'Kesavadasapuram Thiruvananthapuram', 'Nanthancode Thiruvananthapuram',
    'Attingal Thiruvananthapuram', 'Nedumangad Thiruvananthapuram',
  ],
  trivandrum: null, // alias

  // GUWAHATI (Assam)
  guwahati: [
    'Dispur Guwahati', 'Ganeshguri Guwahati', 'GS Road Guwahati',
    'Paltan Bazaar Guwahati', 'Chandmari Guwahati',
    'Bhangagarh Guwahati', 'Six Mile Guwahati',
    'Zoo Road Guwahati', 'Kahilipara Guwahati',
    'Narengi Guwahati', 'Beltola Guwahati',
    'Maligaon Guwahati', 'Jalukbari Guwahati',
  ],

  // TIRUCHIRAPPALLI / TRICHY (Tamil Nadu)
  tiruchirappalli: [
    'Thillai Nagar Trichy', 'KK Nagar Trichy', 'Ariyamangalam Trichy',
    'Srirangam Trichy', 'Woraiyur Trichy', 'Puthur Trichy',
    'Mathur Trichy', 'Mannarpuram Trichy', 'Tennur Trichy',
    'Cantonment Trichy', 'Rockfort Trichy',
  ],
  trichy: null, // alias

  // BHUBANESWAR (Odisha)
  bhubaneswar: [
    'Saheed Nagar Bhubaneswar', 'Nayapalli Bhubaneswar',
    'Patia Bhubaneswar', 'Chandrasekharpur Bhubaneswar',
    'Jagamara Bhubaneswar', 'VSS Nagar Bhubaneswar',
    'Rasulgarh Bhubaneswar', 'Mancheswar Bhubaneswar',
    'Infocity Bhubaneswar', 'Pokhariput Bhubaneswar',
    'Khandagiri Bhubaneswar', 'Dumduma Bhubaneswar',
    'Puri Bhubaneswar',
  ],

  // GUNTUR (Andhra Pradesh)
  guntur: [
    'Guntur', 'Brodipet Guntur', 'Arundalpet Guntur',
    'Narasaraopet Guntur', 'Tenali Guntur', 'Bapatla Guntur',
    'Ongole Guntur', 'Mangalagiri Guntur', 'Tadepalle Guntur',
    'Ponnur Guntur', 'Sattenapalle Guntur', 'Macherla Guntur',
  ],

  // NELLORE (Andhra Pradesh)
  nellore: [
    'Nellore', 'Kavali Nellore', 'Gudur Nellore',
    'Sullurpeta Nellore', 'Venkatagiri Nellore',
    'Atmakur Nellore', 'Kandukur Nellore', 'Markapur Nellore',
  ],

  // KURNOOL (Andhra Pradesh)
  kurnool: [
    'Kurnool', 'Nandyal Kurnool', 'Adoni Kurnool',
    'Dhone Kurnool', 'Alur Kurnool', 'Yemmiganur Kurnool',
    'Atmakur Kurnool',
  ],

  // TIRUPATI (Andhra Pradesh)
  tirupati: [
    'Tirupati', 'Tiruchanur Tirupati', 'Tirumala',
    'Renigunta Tirupati', 'Chandragiri Tirupati',
    'Srikalahasti Tirupati', 'Chittoor Tirupati', 'Puttur Tirupati',
  ],

  // MANGALURU / MANGALORE (Karnataka)
  mangaluru: [
    'Attavar Mangalore', 'Bejai Mangalore', 'Kankanady Mangalore',
    'Balmatta Mangalore', 'Kadri Mangalore', 'Pandeshwar Mangalore',
    'Urwa Mangalore', 'Surathkal Mangalore', 'Bondel Mangalore',
    'Kulur Mangalore', 'Kottara Mangalore',
    'Ullal Mangalore', 'Moodbidri Mangalore',
  ],
  mangalore: null, // alias

  // ──────────────────────────────────────────────────────────────
  //  TIER 3 — DISTRICT / SMALLER CITIES (Telangana & AP focus)
  // ──────────────────────────────────────────────────────────────

  // WARANGAL (Telangana — includes merged corporations + rural mandals)
  warangal: [
    // Core city
    'Warangal', 'Hanamkonda', 'Hanmakonda', 'Kazipet',
    'Subedari Warangal', 'Naimnagar Warangal',
    'Lashkar Bazar Warangal', 'Desaipet Warangal',
    'Khila Warangal', 'Fort Warangal',
    'Kishanpura Warangal', 'Nakkalagutta Warangal',
    'Matwada Warangal', 'BAS Colony Warangal',
    'Mulug Road Warangal', 'Shyampet Warangal',
    'Ramnagar Warangal', 'Mamnoor Warangal',
    'Hunter Road Warangal', 'Station Road Warangal',
    'NIT Warangal', 'KU Campus Warangal',
    'Kakatiya University Warangal', 'Balasamudram Warangal',
    'Chintagattu Warangal', 'Gorrekunta Warangal',
    'Madikonda Warangal', 'Enamamula Warangal',
    'Waddepally Warangal', 'Mucherla Warangal',
    'Warasiguda Warangal', 'Stambampally Warangal',
    // Hanamkonda localities
    'Kakaji Colony Hanamkonda', 'Vidyaranyapuri Hanamkonda',
    'Lakshmipuram Hanamkonda', 'Excise Colony Hanamkonda',
    'Industrial Estate Hanamkonda',
    // Hasanparthy / Bheemaram / merged areas
    'Hasanparthy Warangal', 'Bheemaram Warangal',
    'Dharmasagar Warangal', 'Venkatapur Warangal',
    'Kothawada Warangal', 'Geesugonda Warangal',
    'Paikagudem Warangal', 'Atmakur Warangal',
    // Rural / district
    'Elkathurthy Warangal', 'Nekkonda Warangal',
    'Zafargadh Warangal', 'Nallabelly Warangal',
    'Parvathagiri Warangal', 'Parkal Warangal',
    'Wardhannapet Warangal', 'Station Ghanpur Warangal',
    'Narsampet Warangal', 'Mulugu Warangal',
    'Jangaon Warangal', 'Mahabubabad Warangal',
    'Thorrur Warangal', 'Maripeda Warangal',
    'Ghanpur Warangal', 'Raghunathpalle Warangal',
  ],

  karimnagar: [
    'Karimnagar', 'Jagtial Karimnagar', 'Peddapalli Karimnagar',
    'Mancherial Karimnagar', 'Ramagundam Karimnagar',
    'Godavarikhani Karimnagar', 'Huzurabad Karimnagar',
    'Jammikunta Karimnagar', 'Korutla Karimnagar',
    'Metpally Karimnagar', 'Vemulawada Karimnagar',
    'Sircilla Karimnagar',
  ],

  nizamabad: [
    'Nizamabad', 'Bodhan Nizamabad', 'Armoor Nizamabad',
    'Banswada Nizamabad', 'Kamareddy Nizamabad',
    'Dichpally Nizamabad', 'Yellareddy Nizamabad',
  ],

  khammam: [
    'Khammam', 'Kothagudem Khammam', 'Bhadrachalam Khammam',
    'Yellandu Khammam', 'Sattupally Khammam',
    'Madhira Khammam', 'Wyra Khammam',
    'Burgampadu Khammam', 'Manuguru Khammam',
  ],

  nalgonda: [
    'Nalgonda', 'Suryapet Nalgonda', 'Miryalaguda Nalgonda',
    'Bhongir Nalgonda', 'Devarakonda Nalgonda',
    'Kodad Nalgonda', 'Nakrekal Nalgonda',
  ],

  mahbubnagar: [
    'Mahbubnagar', 'Jadcherla Mahbubnagar', 'Narayanpet Mahbubnagar',
    'Wanaparthy Mahbubnagar', 'Gadwal Mahbubnagar',
    'Kalwakurthy Mahbubnagar', 'Mahabubnagar',
  ],

  // Andhra Pradesh — Tier 3
  rajahmundry: [
    'Rajahmundry', 'Kakinada', 'Amalapuram Rajahmundry',
    'Tanuku Rajahmundry', 'Nidadavole Rajahmundry',
    'Rajam Rajahmundry', 'Mandapeta Rajahmundry',
  ],

  kakinada: [
    'Kakinada', 'Samalkot Kakinada', 'Pithapuram Kakinada',
    'Tuni Kakinada', 'Prathipadu Kakinada',
  ],

  anantapur: [
    'Anantapur', 'Hindupur Anantapur', 'Dharmavaram Anantapur',
    'Guntakal Anantapur', 'Kadiri Anantapur',
    'Madanapalle Anantapur', 'Tadipatri Anantapur',
  ],

  kadapa: [
    'Kadapa', 'Proddatur Kadapa', 'Nandyal Kadapa',
    'Badvel Kadapa', 'Rajampet Kadapa',
    'Jammalamadugu Kadapa', 'Pulivendula Kadapa',
  ],

};

// ════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Returns the list of areas for a given city name.
 * Handles aliases (e.g. "bangalore" → bengaluru areas).
 * Falls back to [cityName] if the city is not in the map.
 *
 * @param {string} cityName
 * @returns {string[]}
 */
export function getAreasForCity(cityName) {
  const key = cityName.toLowerCase().trim();
  const entry = CITY_AREAS[key];

  // null = alias, resolve to the canonical key
  const ALIASES = {
    bangalore: 'bengaluru',
    vizag: 'visakhapatnam',
    cochin: 'kochi',
    mysore: 'mysuru',
    trivandrum: 'thiruvananthapuram',
    trichy: 'tiruchirappalli',
    mangalore: 'mangaluru',
    allahabad: 'prayagraj',
  };

  if (entry === null && ALIASES[key]) {
    return CITY_AREAS[ALIASES[key]] ?? [cityName];
  }

  return entry ?? [cityName];
}

/**
 * Returns all supported city names grouped by tier.
 * @returns {{ tier1: string[], tier2: string[], tier3: string[] }}
 */
export function getCitiesByTier() {
  const tier1 = [], tier2 = [], tier3 = [];
  for (const [city, tier] of Object.entries(CITY_TIER)) {
    if (CITY_AREAS[city] === null) continue; // skip aliases
    if (tier === 1) tier1.push(city);
    else if (tier === 2) tier2.push(city);
    else tier3.push(city);
  }
  return { tier1, tier2, tier3 };
}

/**
 * Returns all supported city keys (canonical, no aliases).
 * @returns {string[]}
 */
export function getSupportedCities() {
  return Object.entries(CITY_AREAS)
    .filter(([, v]) => v !== null)
    .map(([k]) => k);
}
