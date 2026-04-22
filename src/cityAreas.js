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
  ghaziabad: 2, howrah: 2, dhanbad: 2, srinagar: 2,
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
    // Western suburbs
    'Bandra', 'Bandra West', 'Bandra East', 'Bandra Kurla Complex', 'BKC',
    'Khar', 'Khar West', 'Khar East', 'Santacruz', 'Santacruz West', 'Santacruz East',
    'Vile Parle', 'Vile Parle West', 'Vile Parle East',
    'Andheri', 'Andheri West', 'Andheri East', 'Andheri Kurla Road',
    'Jogeshwari', 'Jogeshwari West', 'Jogeshwari East',
    'Goregaon', 'Goregaon West', 'Goregaon East',
    'Malad', 'Malad West', 'Malad East',
    'Kandivali', 'Kandivali West', 'Kandivali East',
    'Borivali', 'Borivali West', 'Borivali East',
    'Dahisar', 'Dahisar West', 'Dahisar East',
    'Mira Road', 'Bhayandar', 'Bhayander', 'Vasai', 'Vasai East', 'Vasai West',
    'Virar', 'Virar West', 'Virar East', 'Nalasopara', 'Naigaon',
    'Juhu', 'Versova', 'Lokhandwala', 'Oshiwara', 'Yari Road',
    'Madh Island', 'Aksa', 'Marve', 'Gorai',
    // Central Mumbai
    'Dadar', 'Dadar West', 'Dadar East', 'Parel', 'Lower Parel',
    'Worli', 'Prabhadevi', 'Mahim', 'Matunga', 'Matunga East', 'Matunga West',
    'Sion', 'Wadala', 'Wadala East', 'Antop Hill', 'Byculla',
    // South Mumbai
    'Colaba', 'Cuffe Parade', 'Nariman Point', 'Fort', 'Churchgate',
    'Marine Lines', 'Marine Drive', 'Kemps Corner', 'Breach Candy',
    'Malabar Hill', 'Walkeshwar', 'Napean Sea Road', 'Peddar Road',
    'Tardeo', 'Grant Road', 'Charni Road', 'Opera House',
    'CSMT', 'Chhatrapati Shivaji Terminus', 'VT', 'Masjid Bunder',
    'Mumbai Central', 'Agripada', 'Mazgaon', 'Dongri',
    // Central / Harbour
    'Kurla', 'Kurla West', 'Kurla East', 'Sakinaka', 'Saki Naka',
    'Powai', 'Hiranandani', 'Hiranandani Gardens', 'IIT Powai',
    'Chandivali', 'Vikhroli', 'Vikhroli West', 'Vikhroli East',
    'Kanjurmarg', 'Kanjurmarg West', 'Kanjurmarg East',
    'Bhandup', 'Bhandup West', 'Bhandup East', 'Nahur',
    'Mulund', 'Mulund West', 'Mulund East',
    'Ghatkopar', 'Ghatkopar West', 'Ghatkopar East',
    'Chembur', 'Chembur East', 'Chembur West', 'Govandi', 'Mankhurd',
    'Tilak Nagar Mumbai', 'Vidyavihar', 'Pant Nagar',
    // Thane
    'Thane', 'Thane West', 'Thane East', 'Naupada Thane', 'Teen Hath Naka',
    'Majiwada', 'Ghodbunder Road', 'Kasarvadavali', 'Hiranandani Estate Thane',
    'Pokhran Road', 'Vartak Nagar', 'Wagle Estate', 'Kolshet Road',
    'Manpada', 'Kapurbawdi', 'Balkum', 'Dhokali',
    // Navi Mumbai
    'Navi Mumbai', 'Vashi', 'Nerul', 'Belapur', 'CBD Belapur',
    'Kharghar', 'Panvel', 'New Panvel', 'Old Panvel',
    'Airoli', 'Ghansoli', 'Koparkhairane', 'Kopar Khairane',
    'Sanpada', 'Juinagar', 'Seawoods', 'Ulwe', 'Kamothe',
    'Taloja', 'Dronagiri', 'Kalamboli', 'Kharghar Sector',
  ],

  // DELHI / NCR
  delhi: [
    // Central Delhi
    'Connaught Place', 'CP Delhi', 'Karol Bagh', 'Paharganj',
    'Khan Market', 'Lodhi Road', 'India Gate', 'Central Secretariat',
    'Chanakyapuri', 'Gole Market', 'Mandi House', 'Barakhamba Road',
    'Rajendra Place', 'Patel Nagar', 'East Patel Nagar', 'West Patel Nagar',
    'Rajinder Nagar', 'Old Rajinder Nagar', 'New Rajinder Nagar',
    'Pusa Road', 'Inderlok', 'Sarai Rohilla', 'Daryaganj',
    // Old Delhi
    'Chandni Chowk', 'Kashmere Gate', 'Civil Lines Delhi', 'Sadar Bazar',
    'Jama Masjid Delhi', 'Ballimaran', 'Ajmeri Gate', 'Turkman Gate',
    // South Delhi
    'South Extension', 'South Ex', 'South Ex Part 1', 'South Ex Part 2',
    'Lajpat Nagar', 'Lajpat Nagar 1', 'Lajpat Nagar 2', 'Lajpat Nagar 4',
    'Defence Colony Delhi', 'Kotla Mubarakpur', 'Jangpura', 'Nizamuddin',
    'Greater Kailash', 'GK 1 Delhi', 'GK 2 Delhi', 'Kailash Colony',
    'CR Park', 'Chittaranjan Park', 'Alaknanda', 'Pamposh Enclave',
    'Nehru Place', 'Kalkaji', 'Govindpuri', 'Okhla', 'Okhla Phase 1',
    'Okhla Phase 2', 'Okhla Phase 3', 'Jasola', 'Jasola Vihar',
    'Sarita Vihar', 'New Friends Colony', 'Maharani Bagh',
    'Hauz Khas', 'Hauz Khas Village', 'Green Park', 'Safdarjung Enclave',
    'Yusuf Sarai', 'Gulmohar Park', 'Panchsheel Park', 'Panchsheel Enclave',
    'Saket', 'Malviya Nagar Delhi', 'Shivalik', 'Khirki Extension',
    'Vasant Kunj', 'Vasant Vihar', 'Munirka', 'RK Puram', 'Moti Bagh',
    'Sarojini Nagar', 'Naraina', 'Mayapuri', 'Kirti Nagar',
    // West Delhi
    'Dwarka', 'Dwarka Sector 1', 'Dwarka Sector 6', 'Dwarka Sector 10',
    'Dwarka Sector 12', 'Dwarka Sector 21', 'Dwarka Mor',
    'Janakpuri', 'Vikaspuri', 'Uttam Nagar', 'Tilak Nagar Delhi',
    'Ramesh Nagar', 'Moti Nagar', 'Rajouri Garden', 'Subhash Nagar',
    'Tagore Garden', 'Punjabi Bagh', 'Paschim Vihar', 'Peeragarhi',
    // North Delhi
    'Rohini', 'Rohini Sector 3', 'Rohini Sector 7', 'Rohini Sector 9',
    'Rohini Sector 11', 'Rohini Sector 13', 'Rohini Sector 18',
    'Rohini Sector 24', 'Pitampura', 'Shalimar Bagh', 'Ashok Vihar',
    'Model Town', 'Derawal Nagar', 'Mukherjee Nagar', 'Kingsway Camp',
    'Timarpur', 'Burari', 'Adarsh Nagar', 'Azadpur', 'Badli',
    'Jahangirpuri', 'Narela', 'Bawana', 'Samaypur Badli',
    'Keshav Puram', 'Netaji Subhash Place', 'NSP Delhi',
    // East Delhi
    'Mayur Vihar', 'Mayur Vihar Phase 1', 'Mayur Vihar Phase 2',
    'Mayur Vihar Phase 3', 'Patparganj', 'IP Extension',
    'Preet Vihar', 'Laxmi Nagar', 'Shakarpur', 'Vinod Nagar',
    'Geeta Colony', 'Krishna Nagar Delhi', 'Gandhi Nagar Delhi',
    'Shahdara', 'Seelampur', 'Welcome Delhi', 'Yamuna Vihar',
    'Dilshad Garden', 'Mansarovar Park', 'Anand Vihar',
    'Vivek Vihar', 'Jhilmil', 'Nand Nagri',
    // South East
    'Jamia Nagar', 'Batla House', 'Okhla Vihar', 'Shaheen Bagh',
    'Abul Fazal Enclave', 'Zakir Nagar', 'Jasola Vihar Delhi',
    // NCR extensions
    'Noida', 'Greater Noida', 'Noida Extension', 'Noida Sector 18',
    'Noida Sector 62', 'Noida Sector 50', 'Noida Sector 137',
    'Noida Sector 15', 'Noida Sector 16', 'Noida Sector 63',
    'Noida Sector 75', 'Noida Sector 76', 'Noida Sector 93',
    'Gurgaon', 'Gurugram', 'Sohna Road Gurgaon',
    'DLF Phase 1 Gurgaon', 'DLF Phase 2 Gurgaon', 'DLF Phase 3 Gurgaon',
    'DLF Phase 4 Gurgaon', 'DLF Phase 5 Gurgaon',
    'MG Road Gurgaon', 'Cyber City Gurgaon', 'Sector 14 Gurgaon',
    'Sector 56 Gurgaon', 'Golf Course Road Gurgaon',
    'Faridabad', 'Ghaziabad', 'Indirapuram', 'Vaishali Ghaziabad',
  ],

  // BENGALURU / BANGALORE (Karnataka)
  bengaluru: [
    // Central
    'MG Road Bangalore', 'Brigade Road', 'Lavelle Road', 'Richmond Road',
    'Richmond Town', 'Residency Road', 'Church Street Bangalore',
    'Commercial Street', 'Shivaji Nagar Bangalore', 'Cubbon Park',
    'Vittal Mallya Road', 'Infantry Road', 'Cunningham Road',
    'Shanti Nagar Bangalore', 'Wilson Garden', 'Lalbagh',
    'Ulsoor', 'Halasuru', 'Frazer Town', 'Cooke Town', 'Cox Town',
    'Benson Town', 'Pulikeshi Nagar', 'Jayamahal', 'Bharathi Nagar',
    // East
    'Indiranagar', 'Indira Nagar Bangalore', 'Domlur', 'Old Airport Road',
    'HAL Old Airport Road', 'CV Raman Nagar', 'Kaggadasapura',
    'Whitefield', 'Whitefield Main Road', 'Hoodi', 'Varthur',
    'Brookefield', 'ITPL', 'Kadugodi', 'Ramagondanahalli',
    'Marathahalli', 'Marathahalli Bridge', 'Bellandur', 'Sarjapur Road',
    'Sarjapura', 'Outer Ring Road Bangalore', 'Kundalahalli', 'Mahadevapura',
    'KR Puram', 'Krishnarajapuram', 'Hoskote', 'Tin Factory',
    // South
    'Koramangala', 'Koramangala 1st Block', 'Koramangala 4th Block',
    'Koramangala 5th Block', 'Koramangala 6th Block', 'Koramangala 7th Block',
    'Koramangala 8th Block', 'Ejipura', 'Agara',
    'HSR Layout', 'HSR Bengaluru', 'HSR Layout Sector 1', 'HSR Layout Sector 2',
    'HSR Layout Sector 7', 'BTM Layout', 'BTM 1st Stage', 'BTM 2nd Stage',
    'Jayanagar', 'Jayanagar 4th Block', 'Jayanagar 9th Block',
    'JP Nagar', 'JP Nagar Phase 1', 'JP Nagar Phase 2', 'JP Nagar Phase 5',
    'JP Nagar Phase 7', 'Bannerghatta Road', 'Electronic City',
    'Electronic City Phase 1', 'Electronic City Phase 2', 'Bommanahalli',
    'Begur', 'Hulimavu', 'Arekere', 'Gottigere', 'Hongasandra',
    'Bommasandra', 'Attibele', 'Anekal', 'Jigani',
    'Basavanagudi', 'Gandhi Bazaar', 'NR Colony', 'Banashankari',
    'Banashankari 2nd Stage', 'Banashankari 3rd Stage', 'Banashankari 6th Stage',
    'Kumaraswamy Layout', 'Padmanabhanagar', 'Girinagar', 'Hanumanthnagar',
    'Uttarahalli', 'Kanakapura Road', 'Thalaghattapura', 'Kaggalipura',
    'Kengeri', 'Kengeri Satellite Town', 'Rajarajeshwari Nagar', 'RR Nagar',
    'Nagarbhavi', 'Vijayanagar Bangalore', 'Nayandahalli', 'BEML Layout',
    // West
    'Malleshwaram', 'Malleswaram', 'Rajajinagar', 'Basaveshwaranagar',
    'Mahalakshmi Layout', 'Yeshwanthpur', 'Yeshwantpur', 'Peenya',
    'Mathikere', 'Gokula', 'Dollars Colony', 'Sadashivanagar',
    'RMV Extension', 'RMV 2nd Stage', 'Sanjaynagar', 'Dollar Colony',
    // North
    'Hebbal', 'Nagawara', 'HBR Layout', 'Kalyan Nagar', 'Banaswadi',
    'Kammanahalli', 'Lingarajapuram', 'Ramamurthy Nagar', 'Ramamurthynagar',
    'Horamavu', 'Kothanur', 'Hennur', 'Hennur Road', 'Thanisandra',
    'Thanisandra Main Road', 'Kogilu', 'Jakkur', 'Yelahanka',
    'Yelahanka New Town', 'Attur', 'Vidyaranyapura', 'Sahakar Nagar',
    'RT Nagar', 'Mekhri Circle', 'Rajmahal Vilas', 'Dasarahalli',
    'Nelamangala', 'Devanahalli', 'KIAL Road', 'Doddaballapur',
    // IT / outskirts
    'Hoskote Bangalore', 'Sarjapur', 'Kadubeesanahalli',
    'Panathur', 'Haralur Road', 'Kaikondrahalli',
    'Ambalipura', 'Munnekollal', 'Devarabisanahalli',
    'Kodihalli', 'HAL 2nd Stage', 'HAL 3rd Stage',
    'Viveknagar', 'Adugodi', 'Dairy Circle', 'Langford Town',
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
    // Central
    'T Nagar', 'Thyagaraya Nagar', 'Nungambakkam', 'Anna Salai',
    'Anna Nagar', 'Anna Nagar East', 'Anna Nagar West',
    'Kilpauk', 'Egmore', 'Chetpet', 'Nandanam', 'Alwarpet',
    'Teynampet', 'Gopalapuram', 'Royapettah', 'Triplicane',
    'Mylapore', 'Mandaveli', 'RA Puram', 'Abhiramapuram',
    'Chamiers Road', 'Luz', 'Santhome',
    // South
    'Adyar', 'Besant Nagar', 'Thiruvanmiyur', 'Kotturpuram',
    'Indira Nagar Chennai', 'Kasturba Nagar', 'Raja Annamalaipuram',
    'Guindy', 'Saidapet', 'Little Mount', 'Ekkaduthangal',
    'Velachery', 'Madipakkam', 'Pallikaranai', 'Keelkattalai',
    'Sholinganallur', 'OMR Chennai', 'Navalur', 'Siruseri',
    'Kelambakkam', 'Thoraipakkam', 'Perungudi', 'Karapakkam',
    'Thiruporur', 'Padur', 'Kovilambakkam', 'Medavakkam',
    'ECR Chennai', 'Palavakkam', 'Neelankarai', 'Injambakkam',
    'Uthandi', 'Akkarai', 'Mahabalipuram Road Chennai',
    // West
    'Ashok Nagar Chennai', 'KK Nagar Chennai', 'West Mambalam',
    'Kodambakkam', 'Vadapalani', 'Virugambakkam',
    'Valasaravakkam', 'Porur', 'Ramapuram', 'Mugalivakkam',
    'Mogappair', 'Mogappair East', 'Mogappair West', 'Maduravoyal',
    'Koyambedu', 'Arumbakkam', 'Aminjikarai', 'Shenoy Nagar',
    'Thirumangalam Chennai', 'Thiruvallur',
    // North / NW
    'Perambur', 'Vyasarpadi', 'Kolathur', 'Villivakkam',
    'Ayanavaram', 'Jamalia', 'Choolai', 'Purasawalkam',
    'Tondiarpet', 'Royapuram', 'Broadway Chennai', 'Sowcarpet',
    'Washermanpet', 'Tiruvottiyur', 'Ennore', 'Manali',
    'Madhavaram', 'Red Hills', 'Ambattur', 'Ambattur Industrial Estate',
    'Pattabiram', 'Avadi', 'Tiruninravur', 'Poonamallee',
    'Nolambur', 'Vanagaram',
    // South suburbs (GST Road)
    'Tambaram', 'Tambaram East', 'Tambaram West',
    'Chromepet', 'Pallavaram', 'Pammal', 'Kundrathur',
    'Perungalathur', 'Selaiyur', 'Camp Road Chennai',
    'Urapakkam', 'Guduvanchery', 'Maraimalai Nagar', 'Chengalpattu',
  ],

  // KOLKATA (West Bengal)
  kolkata: [
    // Central
    'Park Street', 'Park Circus', 'Esplanade Kolkata', 'Dharmatala',
    'Dalhousie', 'BBD Bagh', 'Burrabazar', 'Bowbazar',
    'Sealdah', 'Muchipara', 'Bentinck Street', 'Brabourne Road',
    'Rabindra Sadan', 'Maidan Kolkata', 'Victoria Kolkata',
    'Chowringhee', 'New Market Kolkata', 'Taltala',
    // South
    'Ballygunge', 'Gariahat', 'Rashbehari', 'Lake Gardens',
    'Lake Market', 'Dhakuria', 'Jodhpur Park', 'Hazra',
    'Bhowanipore', 'Kalighat', 'Sarat Bose Road',
    'Tollygunge', 'New Alipore', 'Alipore', 'Chetla',
    'Behala', 'Haridevpur', 'Thakurpukur', 'Joka', 'Budge Budge',
    'Jadavpur', 'Santoshpur', 'Kasba', 'Kalikapur',
    'Baghajatin', 'Patuli', 'Baishnabghata', 'Bansdroni',
    'Garia', 'Sonarpur', 'Narendrapur', 'Rajpur',
    // North
    'Shyambazar', 'Bagbazar', 'Sovabazar', 'Hatibagan',
    'Maniktala', 'Beliaghata', 'Phoolbagan', 'Kankurgachi',
    'Ultadanga', 'Belgachia', 'Sinthee', 'Cossipore',
    'Dum Dum', 'Nagerbazar', 'Lake Town', 'Baguiati',
    'Kestopur', 'VIP Road Kolkata', 'Airport Kolkata',
    'Baranagar', 'Dakshineswar', 'Belur Math',
    'Barrackpore', 'Barasat', 'Madhyamgram',
    // East / Salt Lake / New Town
    'Salt Lake', 'Salt Lake Sector 1', 'Salt Lake Sector 2',
    'Salt Lake Sector 3', 'Salt Lake Sector 5', 'Bidhannagar',
    'New Town Kolkata', 'Rajarhat', 'Action Area 1', 'Action Area 2',
    'Action Area 3', 'Eco Park Kolkata', 'Newtown', 'CG Block',
    'AA Block Salt Lake', 'BD Block Salt Lake',
    'EM Bypass', 'Science City Kolkata', 'Topsia', 'Tangra',
    'Entally', 'Beck Bagan',
    // Howrah
    'Howrah', 'Howrah Maidan', 'Shibpur', 'Bally',
    'Liluah', 'Salkia', 'Ramrajatala', 'Kadamtala',
    // Hooghly
    'Serampore', 'Chandannagar', 'Dankuni', 'Hooghly',
  ],

  // PUNE (Maharashtra)
  pune: [
    // Central / Peth
    'Shivaji Nagar Pune', 'Deccan', 'Deccan Gymkhana', 'FC Road',
    'JM Road', 'Camp Pune', 'MG Road Pune', 'Bundgarden',
    'East Street Pune', 'Empress Garden', 'Koregaon Park',
    'Koregaon Park Annex', 'Boat Club Road', 'Bundgarden Road',
    'Dhole Patil Road', 'Sangamwadi', 'Sadhu Vaswani Chowk',
    'Swargate', 'Shankar Shet Road', 'Bibwewadi', 'Katraj',
    'Dhankawadi', 'Ambegaon', 'Sahakar Nagar Pune',
    // West
    'Kothrud', 'Karve Nagar', 'Warje', 'Erandwane', 'Model Colony',
    'Prabhat Road', 'Paud Road', 'Ideal Colony', 'Mayur Colony',
    'Law College Road', 'Bhandarkar Road', 'Shivaji Housing Society',
    'Aundh', 'Baner', 'Balewadi', 'Pashan', 'Sus', 'Sus Road',
    'Bavdhan', 'Bavdhan Budruk', 'Sutarwadi', 'Bhugaon', 'Lavale',
    // North
    'Pimpri', 'Pimpri Chinchwad', 'Chinchwad', 'Akurdi',
    'Nigdi', 'Ravet', 'Kiwale', 'Punawale', 'Tathawade',
    'Wakad', 'Pimple Saudagar', 'Pimple Nilakh', 'Pimple Gurav',
    'Sangvi', 'Pimple Sangvi', 'Dapodi', 'Bhosari',
    'Moshi', 'Charholi', 'Dehu Road', 'Dehu', 'Talegaon',
    'Talegaon Dabhade', 'Chakan', 'Khed Pune',
    // Hinjawadi / IT corridor
    'Hinjewadi', 'Hinjawadi', 'Hinjawadi Phase 1', 'Hinjawadi Phase 2',
    'Hinjawadi Phase 3', 'Marunji', 'Maan', 'Wakad IT Park',
    'Mulshi', 'Kasarsai',
    // East
    'Viman Nagar', 'Kalyani Nagar', 'Yerwada', 'Kharadi',
    'Chandan Nagar Pune', 'Wagholi', 'Lohegaon', 'Dhanori',
    'Wadgaon Sheri', 'Vishrantwadi', 'Tingre Nagar',
    'Magarpatta', 'Hadapsar', 'Mundhwa', 'Keshavnagar',
    'Manjri', 'Uruli Kanchan',
    // South
    'NIBM', 'NIBM Road', 'Kondhwa', 'Kondhwa Budruk', 'Kondhwa Khurd',
    'Undri', 'Pisoli', 'Mohammedwadi', 'Wanowrie', 'Salunke Vihar',
    'Fatima Nagar', 'Lullanagar', 'Ghorpadi', 'Handewadi',
    // Satellite towns
    'Lonavala', 'Khandala', 'Kasarwadi',
  ],

  // AHMEDABAD (Gujarat)
  ahmedabad: [
    // Central / old city
    'Lal Darwaja Ahmedabad', 'Manek Chowk Ahmedabad', 'Bhadra Ahmedabad',
    'Relief Road Ahmedabad', 'Ashram Road Ahmedabad', 'CG Road Ahmedabad',
    'Law Garden Ahmedabad', 'Stadium Road Ahmedabad',
    'Navrangpura Ahmedabad', 'Paldi Ahmedabad', 'Ellisbridge Ahmedabad',
    'Ambawadi Ahmedabad', 'Usmanpura Ahmedabad', 'Naranpura Ahmedabad',
    // East
    'Maninagar Ahmedabad', 'Kankaria Ahmedabad', 'Khokhra Ahmedabad',
    'Isanpur Ahmedabad', 'Vatva Ahmedabad', 'Narol Ahmedabad',
    'Lambha Ahmedabad', 'Bapunagar Ahmedabad', 'Gomtipur Ahmedabad',
    'Rakhial Ahmedabad', 'Saraspur Ahmedabad', 'Asarwa Ahmedabad',
    'Shahibaug Ahmedabad', 'Meghaninagar Ahmedabad',
    'Naroda Ahmedabad', 'Kubernagar Ahmedabad', 'Odhav Ahmedabad',
    'Vastral Ahmedabad', 'Ramol Ahmedabad', 'Hatkeshwar Ahmedabad',
    'Nikol Ahmedabad', 'New Nikol Ahmedabad',
    // West
    'Vastrapur Ahmedabad', 'Bodakdev Ahmedabad', 'Thaltej Ahmedabad',
    'SG Highway Ahmedabad', 'SG Road Ahmedabad', 'Prahlad Nagar Ahmedabad',
    'Prahladnagar Ahmedabad', 'Satellite Ahmedabad', 'Jodhpur Ahmedabad',
    'Makarba Ahmedabad', 'Ambli Ahmedabad', 'Bopal Ahmedabad',
    'South Bopal Ahmedabad', 'Shilaj Ahmedabad', 'Science City Ahmedabad',
    'Ghuma Ahmedabad', 'Shela Ahmedabad', 'Vejalpur Ahmedabad',
    'Juhapura Ahmedabad', 'Sarkhej Ahmedabad', 'Vasna Ahmedabad',
    // North
    'Ghatlodia Ahmedabad', 'Sola Ahmedabad', 'Gota Ahmedabad',
    'Chandkheda Ahmedabad', 'Motera Ahmedabad', 'Sabarmati Ahmedabad',
    'New Ranip Ahmedabad', 'Nava Vadaj Ahmedabad', 'Vadaj Ahmedabad',
    'Ranip Ahmedabad', 'Koba Ahmedabad', 'Chharodi Ahmedabad',
    'Gandhinagar Highway Ahmedabad', 'Adalaj Ahmedabad',
    'Moti Shahibag Ahmedabad', 'Khanpur Ahmedabad',
    // Satellite / extensions
    'Gandhinagar', 'Sanand Ahmedabad', 'Kalol Ahmedabad', 'Mehsana',
    'Sarangpur Ahmedabad', 'Kalupur Ahmedabad',
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
    'Johari Bazaar Jaipur', 'MI Road Jaipur', 'Bapu Bazar Jaipur',
    'Tripolia Bazar Jaipur', 'Chandpole Jaipur', 'Gopalpura Jaipur',
    'Gopalpura Bypass Jaipur', 'Durgapura Jaipur', 'Mahesh Nagar Jaipur',
    'Adarsh Nagar Jaipur', 'Ramganj Bazaar Jaipur', 'Jawahar Nagar Jaipur',
    'Jhotwara Jaipur', 'Vidyadhar Nagar Jaipur', 'Khatipura Jaipur',
    'Niwaru Road Jaipur', 'Kalwar Road Jaipur', 'Ambabari Jaipur',
    'Bhawani Singh Road Jaipur', 'Jagatpura Road Jaipur', 'Muhana Jaipur',
    'Jaipur Sanganer Airport Road', 'Gandhi Nagar Jaipur', 'Barkat Nagar Jaipur',
    'Tilak Nagar Jaipur', 'Hawa Mahal Jaipur', 'Amer Road Jaipur',
    'Chaura Rasta Jaipur', 'Bais Godam Jaipur', 'Pink City Jaipur',
    'Mahapura Jaipur', 'Agra Road Jaipur', 'Transport Nagar Jaipur',
    'Govindpura Jaipur',
  ],

  // LUCKNOW (Uttar Pradesh)
  lucknow: [
    'Gomti Nagar Lucknow', 'Gomti Nagar Extension Lucknow',
    'Hazratganj Lucknow', 'Indira Nagar Lucknow', 'Aliganj Lucknow',
    'Vikas Nagar Lucknow', 'Alambagh Lucknow', 'Chowk Lucknow',
    'Aminabad Lucknow', 'Mahanagar Lucknow', 'Rajajipuram Lucknow',
    'Chinhat Lucknow', 'Faizabad Road Lucknow', 'Kanpur Road Lucknow',
    'Sultanpur Road Lucknow', 'Jankipuram Lucknow',
    'Vrindavan Yojana Lucknow', 'Sushant Golf City Lucknow',
    'Kapoorthala Lucknow', 'Jopling Road Lucknow', 'Ashiana Lucknow',
    'LDA Colony Lucknow', 'Eldeco Lucknow', 'Nishatganj Lucknow',
    'Charbagh Lucknow', 'Kaiserbagh Lucknow', 'Lalbagh Lucknow',
    'Gautam Palli Lucknow', 'Sarojini Nagar Lucknow', 'Thakurganj Lucknow',
    'Balaganj Lucknow', 'Daliganj Lucknow', 'Rajendra Nagar Lucknow',
    'Telibagh Lucknow', 'PGI Lucknow', 'Bangla Bazar Lucknow',
    'Raebareli Road Lucknow', 'Hardoi Road Lucknow', 'Aashiana Lucknow',
    'Naka Hindola Lucknow', 'Vibhuti Khand Lucknow', 'Patrakarpuram Lucknow',
    'Shaheed Path Lucknow', 'IIM Road Lucknow', 'Jankipuram Extension Lucknow',
    'Jankipuram Garden Lucknow', 'Para Lucknow', 'Mohan Road Lucknow',
    'Dubagga Lucknow', 'Chowk Bazaar Lucknow',
  ],

  // SURAT (Gujarat)
  surat: [
    'Adajan Surat', 'Vesu Surat', 'Piplod Surat', 'Pal Surat',
    'Katargam Surat', 'Varachha Surat', 'Udhna Surat', 'Rander Surat',
    'Althan Surat', 'Citylight Surat', 'Athwa Surat', 'Athwagate Surat',
    'Ring Road Surat', 'Bhestan Surat', 'Dumas Surat', 'Sachin Surat',
    'Sarthana Surat', 'Katargam Road Surat', 'Magdalla Surat',
    'Dindoli Surat', 'Pandesara Surat', 'Limbayat Surat', 'Parvat Patiya Surat',
    'Puna Surat', 'Kapodra Surat', 'Nanpura Surat', 'Begumpura Surat',
    'Majura Gate Surat', 'Chowk Bazaar Surat', 'Bhatar Surat',
    'Palanpur Gam Surat', 'Jahangirpura Surat', 'Jahangirabad Surat',
    'Hazira Surat', 'Ichchhanath Surat', 'VIP Road Surat',
    'Anand Mahal Road Surat', 'Amroli Surat', 'Mota Varachha Surat',
    'Nana Varachha Surat', 'Singanpore Surat', 'Rander Road Surat',
    'Olpad Surat', 'Bardoli Surat', 'Navsari Road Surat',
    'Ghod Dod Road Surat', 'Parle Point Surat',
  ],

  // KANPUR (Uttar Pradesh)
  kanpur: [
    'Kanpur', 'Swaroop Nagar Kanpur', 'Civil Lines Kanpur',
    'Kakadeo Kanpur', 'Kalyanpur Kanpur', 'Panki Kanpur',
    'Govind Nagar Kanpur', 'Shyam Nagar Kanpur', 'Barra Kanpur',
    'Keshav Puram Kanpur', 'Vikas Nagar Kanpur', 'Pandu Nagar Kanpur',
    'Harsh Nagar Kanpur', 'Yashoda Nagar Kanpur', 'Saket Nagar Kanpur',
    'Jajmau Kanpur', 'Tatmill Kanpur', 'Parade Kanpur',
    'Birhana Road Kanpur', 'Mall Road Kanpur', 'Gumti Kanpur',
    'Fazalganj Kanpur', 'Chakeri Kanpur', 'Rawatpur Kanpur',
    'Kidwai Nagar Kanpur', 'Ramadevi Kanpur', 'Naubasta Kanpur',
    'Gujaini Kanpur', 'Arya Nagar Kanpur', 'Shastri Nagar Kanpur',
    'Ashok Nagar Kanpur', 'Juhi Kanpur', 'Lal Bangla Kanpur',
    'GT Road Kanpur', 'Hamirpur Road Kanpur', 'Indira Nagar Kanpur',
    'Azad Nagar Kanpur', 'Vijay Nagar Kanpur', 'IIT Kanpur',
    'Mandhana Kanpur', 'Bithoor Kanpur',
  ],

  // NAGPUR (Maharashtra)
  nagpur: [
    'Dharampeth Nagpur', 'Ramdaspeth Nagpur', 'Civil Lines Nagpur',
    'Sitabuldi Nagpur', 'Sadar Nagpur', 'Gandhibagh Nagpur',
    'Itwari Nagpur', 'Pratap Nagar Nagpur', 'Manish Nagar Nagpur',
    'Bajaj Nagar Nagpur', 'Trimurti Nagar Nagpur',
    'Hingna Road Nagpur', 'Wardha Road Nagpur', 'Amravati Road Nagpur',
    'Katol Road Nagpur', 'Kalamna Nagpur', 'Besa Nagpur', 'Wathoda Nagpur',
    'Mahal Nagpur', 'Shankar Nagar Nagpur', 'Laxmi Nagar Nagpur',
    'Rana Pratap Nagar Nagpur', 'Jaripatka Nagpur', 'Gittikhadan Nagpur',
    'Medical Square Nagpur', 'Ajni Nagpur', 'Nandanvan Nagpur',
    'Narendra Nagar Nagpur', 'Manewada Nagpur', 'Hudkeshwar Nagpur',
    'Omkar Nagar Nagpur', 'Jaiprakash Nagar Nagpur', 'Dighori Nagpur',
    'Nara Nagpur', 'Friends Colony Nagpur', 'Telangkhedi Nagpur',
    'Seminary Hills Nagpur', 'Byramji Town Nagpur', 'Dhantoli Nagpur',
    'MIHAN Nagpur', 'Khamla Nagpur', 'Chhaoni Nagpur',
    'Sakkardara Nagpur', 'Pachpaoli Nagpur', 'Koradi Road Nagpur',
    'Mankapur Nagpur',
  ],

  // INDORE (Madhya Pradesh)
  indore: [
    'Vijay Nagar Indore', 'Palasia Indore', 'MG Road Indore',
    'Scheme 54 Indore', 'Scheme 78 Indore', 'Scheme 114 Indore',
    'South Tukoganj Indore', 'North Tukoganj Indore', 'Sapna Sangeeta Indore',
    'AB Road Indore', 'LIG Colony Indore', 'Lasudia Mori Indore',
    'Rau Indore', 'Bhicholi Mardana Indore', 'Nipania Indore',
    'Khandwa Road Indore', 'Dhar Road Indore', 'Geeta Bhawan Indore',
    'Annapurna Road Indore', 'Rajwada Indore', 'Sarafa Indore',
    'Siyaganj Indore', 'Chhawni Indore', 'Nanda Nagar Indore',
    'Tilak Nagar Indore', 'Bengali Square Indore', 'Bhawarkuan Indore',
    'Chhoti Gwaltoli Indore', 'Navlakha Indore', 'Usha Nagar Indore',
    'New Palasia Indore', 'Old Palasia Indore', 'Race Course Road Indore',
    'Saket Nagar Indore', 'Sudama Nagar Indore', 'Pipliyahana Indore',
    'Kanadia Road Indore', 'Bypass Road Indore', 'Bicholi Hapsi Indore',
    'Mhow Indore', 'Rajendra Nagar Indore', 'Manik Bagh Indore',
    'Silicon City Indore', 'Super Corridor Indore', 'Mahalaxmi Nagar Indore',
    'Shakar Khedi Indore', 'Manorama Ganj Indore',
  ],

  // BHOPAL (Madhya Pradesh)
  bhopal: [
    'MP Nagar Bhopal', 'Arera Colony Bhopal', 'Hoshangabad Road Bhopal',
    'Kolar Road Bhopal', 'Awadhpuri Bhopal', 'Shahpura Bhopal',
    'Misrod Bhopal', 'Berasia Road Bhopal', 'Ayodhya Bypass Bhopal',
    'Raisen Road Bhopal', 'TT Nagar Bhopal', 'New Market Bhopal',
    'Bittan Market Bhopal', 'Gulmohar Bhopal', 'Chuna Bhatti Bhopal',
    'Bhel Bhopal', 'Piplani Bhopal', 'Habibganj Bhopal',
    'Ashoka Garden Bhopal', 'Ibrahimpura Bhopal', 'Peer Gate Bhopal',
    'Jahangirabad Bhopal', 'Indrapuri Bhopal', 'E5 Arera Colony Bhopal',
    'E7 Arera Colony Bhopal', 'E8 Arera Colony Bhopal', 'Shivaji Nagar Bhopal',
    'Chetak Bridge Bhopal', 'Lalghati Bhopal', 'Bairagarh Bhopal',
    'Bhadbhada Road Bhopal', 'Nehru Nagar Bhopal', 'Govindpura Bhopal',
    'Karond Bhopal', 'Ratibad Bhopal', 'Neelbad Bhopal',
    'Katara Hills Bhopal', 'Bawadiya Kalan Bhopal', 'Anand Nagar Bhopal',
    'Salaiya Bhopal', 'Patel Nagar Bhopal', 'Mandi Dev Bhopal',
    'Jinsi Bhopal', 'Sultania Road Bhopal',
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
    'Asilmetta Visakhapatnam', 'Jagadamba Centre Visakhapatnam',
    'Daba Gardens Visakhapatnam', 'RK Beach Visakhapatnam',
    'Lawsons Bay Colony Visakhapatnam', 'Siripuram Visakhapatnam',
    'Beach Road Visakhapatnam', 'Allipuram Visakhapatnam',
    'NAD Junction Visakhapatnam', 'Kurmannapalem Visakhapatnam',
    'Malkapuram Visakhapatnam', 'Duvvada Visakhapatnam',
    'Kancharapalem Visakhapatnam', 'Ramakrishna Beach Visakhapatnam',
    'Arilova Visakhapatnam', 'PM Palem Visakhapatnam',
    'Yendada Visakhapatnam', 'Vepagunta Visakhapatnam',
    'Vuda Colony Visakhapatnam', 'Sujatha Nagar Visakhapatnam',
    'Murali Nagar Visakhapatnam', 'Visalakshi Nagar Visakhapatnam',
    'Resapuvanipalem Visakhapatnam', 'Kapuluppada Visakhapatnam',
    'Tagarapuvalasa Visakhapatnam',
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
    'Tadepalli Vijayawada', 'Mangalagiri Vijayawada',
    'Penamaluru Vijayawada', 'Ramavarappadu Vijayawada',
    'Kondapalli Vijayawada', 'Bandar Road Vijayawada',
    'Eluru Road Vijayawada', 'Besant Road Vijayawada',
    'Currency Nagar Vijayawada', 'Ajit Singh Nagar Vijayawada',
    'Payakapuram Vijayawada', 'Singh Nagar Vijayawada',
    'Bhavanipuram Vijayawada', 'Poranki Vijayawada',
    'Ramalingeswara Nagar Vijayawada', 'Satyanarayanapuram Vijayawada',
    'NTR University Vijayawada', 'Governor Peta Vijayawada',
    'Suryaraopeta Vijayawada', 'Yanamalakuduru Vijayawada',
  ],

  // PATNA (Bihar)
  patna: [
    'Boring Road Patna', 'Kankarbagh Patna', 'Rajendra Nagar Patna',
    'Patliputra Patna', 'Anisabad Patna', 'Ashok Rajpath Patna',
    'Bailey Road Patna', 'Fraser Road Patna', 'Gandhi Maidan Patna',
    'Kurji Patna', 'Phulwari Patna', 'Danapur Patna',
    'Rupaspur Patna', 'Saguna More Patna',
    'Rajiv Nagar Patna', 'Jagdeo Path Patna', 'SK Puri Patna',
    'Patna City', 'Gulzarbagh Patna', 'Mithapur Patna',
    'Kumhrar Patna', 'New Patliputra Colony Patna', 'Indrapuri Patna',
    'Ramkrishna Nagar Patna', 'Sri Krishna Nagar Patna',
    'Transport Nagar Patna', 'Khagaul Patna', 'Punaichak Patna',
    'Khajpura Patna', 'Jakkanpur Patna', 'Mahendru Patna',
    'Bankipore Patna', 'Mainpura Patna', 'Patrakar Nagar Patna',
    'Rajabazar Patna', 'Exhibition Road Patna', 'Dakbungalow Patna',
    'Budh Marg Patna', 'Bihta Patna', 'Naubatpur Patna',
    'Paliganj Patna', 'Fatuha Patna', 'Maner Patna',
  ],

  // VADODARA (Gujarat)
  vadodara: [
    'Alkapuri Vadodara', 'Fatehgunj Vadodara', 'Gotri Vadodara',
    'Vasna Road Vadodara', 'Nizampura Vadodara', 'Waghodia Road Vadodara',
    'Manjalpur Vadodara', 'Karelibaug Vadodara', 'Productivity Road Vadodara',
    'Sayajigunj Vadodara', 'Racecourse Vadodara',
    'Akota Vadodara', 'Diwalipura Vadodara', 'Ellora Park Vadodara',
    'Old Padra Road Vadodara', 'New Sama Vadodara', 'Sama Vadodara',
    'Harni Road Vadodara', 'Tandalja Vadodara', 'Bhayli Vadodara',
    'Atladara Vadodara', 'Tarsali Vadodara', 'Makarpura Vadodara',
    'Sayaji Gunj Vadodara', 'Mandvi Vadodara', 'Dandia Bazar Vadodara',
    'Navapura Vadodara', 'Salatwada Vadodara', 'Gorwa Vadodara',
    'Chhani Vadodara', 'Padra Vadodara', 'Subhanpura Vadodara',
    'Jetalpur Road Vadodara', 'Kala Ghoda Vadodara', 'Channi Road Vadodara',
    'Bapod Vadodara', 'Raopura Vadodara',
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
    'Town Hall Coimbatore', 'Avinashi Road Coimbatore',
    'Trichy Road Coimbatore', 'Mettupalayam Road Coimbatore',
    'Tidel Park Coimbatore', 'Keeranatham Coimbatore',
    'Kalapatti Coimbatore', 'Vilankurichi Coimbatore',
    'Kovaipudur Coimbatore', 'Ramanathapuram Coimbatore',
    'Podanur Coimbatore', 'Madukkarai Coimbatore',
    'Ganapathy Pudur Coimbatore', 'Thadagam Road Coimbatore',
    'Selvapuram Coimbatore', 'Papanaickenpalayam Coimbatore',
    'Sivananda Colony Coimbatore', 'Telungupalayam Coimbatore',
    'Kavundampalayam Coimbatore', 'Edayarpalayam Coimbatore',
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
    'Infopark Kochi', 'Smart City Kochi', 'Kakkanad West Kochi',
    'Thrikkakara Kochi', 'Chottanikkara Kochi', 'Pachalam Kochi',
    'Elamakkara Kochi', 'Kathrikadavu Kochi', 'Girinagar Kochi',
    'Thevara Kochi', 'Thammanam Kochi', 'Vennala Kochi',
    'Padivattom Kochi', 'Edappally Toll Kochi', 'Chittoor Road Kochi',
    'Banerji Road Kochi', 'Jose Junction Kochi', 'Pallimukku Kochi',
    'Vennala Road Kochi', 'Willingdon Island Kochi',
    'South Railway Station Kochi',
  ],
  cochin: null, // alias

  // CHANDIGARH (UT)
  chandigarh: [
    'Sector 17 Chandigarh', 'Sector 22 Chandigarh', 'Sector 35 Chandigarh',
    'Sector 26 Chandigarh', 'Sector 34 Chandigarh', 'Sector 43 Chandigarh',
    'Sector 44 Chandigarh', 'Mohali', 'Panchkula',
    'Zirakpur', 'Derabassi', 'Kharar',
    'Sector 7 Chandigarh', 'Sector 8 Chandigarh', 'Sector 9 Chandigarh',
    'Sector 10 Chandigarh', 'Sector 11 Chandigarh', 'Sector 15 Chandigarh',
    'Sector 16 Chandigarh', 'Sector 18 Chandigarh', 'Sector 19 Chandigarh',
    'Sector 20 Chandigarh', 'Sector 21 Chandigarh', 'Sector 24 Chandigarh',
    'Sector 27 Chandigarh', 'Sector 32 Chandigarh', 'Sector 37 Chandigarh',
    'Sector 38 Chandigarh', 'Sector 40 Chandigarh', 'Sector 45 Chandigarh',
    'Manimajra Chandigarh', 'Industrial Area Chandigarh',
    'IT Park Chandigarh', 'Panchkula Sector 5', 'Panchkula Sector 7',
    'Panchkula Sector 8', 'Panchkula Sector 11', 'Panchkula Sector 20',
    'Mohali Phase 3B2', 'Mohali Phase 5', 'Mohali Phase 7',
    'Mohali Phase 10', 'Mohali Phase 11', 'Aerocity Mohali',
  ],

  // VARANASI (Uttar Pradesh)
  varanasi: [
    'Sigra Varanasi', 'Lanka Varanasi', 'Assi Ghat Varanasi',
    'Godowlia Varanasi', 'Nadesar Varanasi', 'Cantonment Varanasi',
    'Sarnath Varanasi', 'Bhelupur Varanasi', 'Shivpur Varanasi',
    'Rohania Varanasi', 'Sundarpur Varanasi', 'Pandeypur Varanasi',
    'Dashashwamedh Varanasi', 'Mahmoorganj Varanasi', 'Chowk Varanasi',
    'Durgakund Varanasi', 'Ravindrapuri Varanasi', 'Maldahiya Varanasi',
    'Lahartara Varanasi', 'Manduadih Varanasi', 'BHU Varanasi',
    'Chetganj Varanasi', 'Nagwa Varanasi', 'Sarai Mohana Varanasi',
    'Bhojubeer Varanasi', 'Pandeypur Crossing Varanasi',
    'Khojwa Varanasi', 'Sonarpura Varanasi', 'Mahavir Nagar Varanasi',
    'Newada Varanasi',
  ],

  // MADURAI (Tamil Nadu)
  madurai: [
    'Anna Nagar Madurai', 'KK Nagar Madurai', 'Tallakulam Madurai',
    'Krishnasamy Nagar Madurai', 'Vilangudi Madurai',
    'Nagamalai Madurai', 'Thirunagar Madurai',
    'Alagar Kovil Road Madurai', 'Melur Madurai',
    'Paravai Madurai', 'Tirupparankundram Madurai',
    'Simmakkal Madurai', 'West Masi Street Madurai',
    'East Masi Street Madurai', 'Town Hall Road Madurai',
    'Goripalayam Madurai', 'Mattuthavani Madurai',
    'Arapalayam Madurai', 'Villapuram Madurai', 'Sellur Madurai',
    'Chokkikulam Madurai', 'Iyer Bungalow Madurai',
    'SS Colony Madurai', 'Meenakshi Nagar Madurai',
    'Jaihindpuram Madurai', 'Bypass Road Madurai',
    'Kochadai Madurai', 'Madurai South', 'Thiruparankundram Madurai',
    'Othakadai Madurai', 'Avaniyapuram Madurai',
  ],

  // MYSURU / MYSORE (Karnataka)
  mysuru: [
    'Saraswathipuram Mysore', 'Kuvempunagar Mysore',
    'Vijayanagar Mysore', 'Hebbal Mysore', 'Gokulam Mysore',
    'Jayalakshmipuram Mysore', 'Siddartha Layout Mysore',
    'Bogadi Mysore', 'Dattagalli Mysore', 'Nanjangud Mysore',
    'Hunsur Mysore', 'Srirangapatna Mysore',
    'Chamundi Hills Mysore', 'Lashkar Mohalla Mysore',
    'Lakshmipuram Mysore', 'Chamundipuram Mysore',
    'Agrahara Mysore', 'Yadavagiri Mysore', 'Nazarbad Mysore',
    'Mandi Mohalla Mysore', 'Devaraja Mohalla Mysore',
    'JP Nagar Mysore', 'Rajendranagar Mysore',
    'Ramakrishna Nagar Mysore', 'Vontikoppal Mysore',
    'Metagalli Mysore', 'Bannimantap Mysore', 'Udayagiri Mysore',
    'Ashokapuram Mysore', 'Kesare Mysore', 'Ring Road Mysore',
    'Bannur Road Mysore', 'TK Layout Mysore',
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
    'Statue Thiruvananthapuram', 'East Fort Thiruvananthapuram',
    'Thampanoor Thiruvananthapuram', 'Chalai Thiruvananthapuram',
    'Manacaud Thiruvananthapuram', 'Kallayam Thiruvananthapuram',
    'Peroorkada Thiruvananthapuram', 'Poojappura Thiruvananthapuram',
    'Jagathy Thiruvananthapuram', 'Karamana Thiruvananthapuram',
    'Thycaud Thiruvananthapuram', 'Kaimanam Thiruvananthapuram',
    'Ulloor Thiruvananthapuram', 'Akkulam Thiruvananthapuram',
    'Kovalam Thiruvananthapuram', 'Vizhinjam Thiruvananthapuram',
    'Varkala Thiruvananthapuram',
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
    'Fancy Bazar Guwahati', 'Uzan Bazar Guwahati',
    'Silpukhuri Guwahati', 'Rehabari Guwahati',
    'Lachit Nagar Guwahati', 'Ulubari Guwahati',
    'Hengrabari Guwahati', 'Basistha Guwahati',
    'Khanapara Guwahati', 'Lokhra Guwahati',
    'Noonmati Guwahati', 'Amingaon Guwahati',
    'Panbazar Guwahati', 'Rajgarh Guwahati',
    'Bamunimaidan Guwahati',
  ],

  // TIRUCHIRAPPALLI / TRICHY (Tamil Nadu)
  tiruchirappalli: [
    'Thillai Nagar Trichy', 'KK Nagar Trichy', 'Ariyamangalam Trichy',
    'Srirangam Trichy', 'Woraiyur Trichy', 'Puthur Trichy',
    'Mathur Trichy', 'Mannarpuram Trichy', 'Tennur Trichy',
    'Cantonment Trichy', 'Rockfort Trichy',
    'Thiruverumbur Trichy', 'BHEL Trichy', 'Kailasapuram Trichy',
    'Ponmalai Trichy', 'Golden Rock Trichy', 'Trichy Junction',
    'Palakarai Trichy', 'Chatram Trichy', 'Crawford Trichy',
    'Fort Station Road Trichy', 'Sangillyandapuram Trichy',
    'Edamalaipattipudur Trichy', 'Subramaniapuram Trichy',
    'Thillai Nagar Main Road Trichy', 'Karumandapam Trichy',
    'Kajamalai Trichy',
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
    'Old Town Bhubaneswar', 'Lingaraj Bhubaneswar',
    'Master Canteen Bhubaneswar', 'Kharavela Nagar Bhubaneswar',
    'Bapuji Nagar Bhubaneswar', 'Unit 1 Bhubaneswar',
    'Unit 3 Bhubaneswar', 'Unit 9 Bhubaneswar', 'Unit 6 Bhubaneswar',
    'Acharya Vihar Bhubaneswar', 'Vani Vihar Bhubaneswar',
    'Jaydev Vihar Bhubaneswar', 'Kalinga Nagar Bhubaneswar',
    'Tomando Bhubaneswar', 'Bomikhal Bhubaneswar',
    'Laxmi Sagar Bhubaneswar', 'Palasuni Bhubaneswar',
    'Baramunda Bhubaneswar', 'Aiginia Bhubaneswar',
    'Sundarpada Bhubaneswar',
  ],

  // GUNTUR (Andhra Pradesh)
  guntur: [
    'Guntur', 'Brodipet Guntur', 'Arundalpet Guntur',
    'Narasaraopet Guntur', 'Tenali Guntur', 'Bapatla Guntur',
    'Ongole Guntur', 'Mangalagiri Guntur', 'Tadepalle Guntur',
    'Ponnur Guntur', 'Sattenapalle Guntur', 'Macherla Guntur',
    'Lakshmipuram Guntur', 'Pattabhipuram Guntur', 'Kothapet Guntur',
    'Amaravathi Road Guntur', 'Old Guntur', 'Gorantla Guntur',
    'Nallapadu Guntur', 'Chilakaluripet Guntur', 'Narasaraopeta Guntur',
    'Repalle Guntur', 'Vinukonda Guntur', 'Piduguralla Guntur',
    'Pedakakani Guntur', 'AT Agraharam Guntur',
  ],

  // NELLORE (Andhra Pradesh)
  nellore: [
    'Nellore', 'Kavali Nellore', 'Gudur Nellore',
    'Sullurpeta Nellore', 'Venkatagiri Nellore',
    'Atmakur Nellore', 'Kandukur Nellore', 'Markapur Nellore',
    'Dargamitta Nellore', 'Trunk Road Nellore', 'Magunta Layout Nellore',
    'Balaji Nagar Nellore', 'Mini Bypass Road Nellore',
    'Podalakur Road Nellore', 'Ramalingapuram Nellore',
    'AC Subba Reddy Nagar Nellore', 'Fathekhanpet Nellore',
    'Santhapet Nellore', 'Brahmanandapuram Nellore',
    'Mulapet Nellore', 'Stonehousepet Nellore',
  ],

  // KURNOOL (Andhra Pradesh)
  kurnool: [
    'Kurnool', 'Nandyal Kurnool', 'Adoni Kurnool',
    'Dhone Kurnool', 'Alur Kurnool', 'Yemmiganur Kurnool',
    'Atmakur Kurnool', 'Banaganapalle Kurnool', 'Allagadda Kurnool',
    'Bethamcherla Kurnool', 'Kodumur Kurnool', 'Gudur Kurnool',
    'Pattikonda Kurnool', 'Srisailam Kurnool',
    'Raja Vihar Kurnool', 'Budhwarpet Kurnool',
    'Kallur Kurnool', 'Ashok Nagar Kurnool',
    'R S Road Kurnool', 'B Camp Kurnool', 'C Camp Kurnool',
  ],

  // TIRUPATI (Andhra Pradesh)
  tirupati: [
    'Tirupati', 'Tiruchanur Tirupati', 'Tirumala',
    'Renigunta Tirupati', 'Chandragiri Tirupati',
    'Srikalahasti Tirupati', 'Chittoor Tirupati', 'Puttur Tirupati',
    'Alipiri Tirupati', 'Korlagunta Tirupati', 'RC Road Tirupati',
    'Padmavati Nagar Tirupati', 'Bairagipatteda Tirupati',
    'SV University Tirupati', 'Air Bypass Road Tirupati',
    'Leela Mahal Tirupati', 'AIR Bypass Tirupati',
    'Tiruchanoor Road Tirupati', 'Avilala Tirupati',
    'Karakambadi Road Tirupati', 'MR Palli Tirupati',
    'Perur Tirupati',
  ],

  // MANGALURU / MANGALORE (Karnataka)
  mangaluru: [
    'Attavar Mangalore', 'Bejai Mangalore', 'Kankanady Mangalore',
    'Balmatta Mangalore', 'Kadri Mangalore', 'Pandeshwar Mangalore',
    'Urwa Mangalore', 'Surathkal Mangalore', 'Bondel Mangalore',
    'Kulur Mangalore', 'Kottara Mangalore',
    'Ullal Mangalore', 'Moodbidri Mangalore',
    'Hampankatta Mangalore', 'Lalbagh Mangalore',
    'Bunts Hostel Road Mangalore', 'MG Road Mangalore',
    'Bendoorwell Mangalore', 'Falnir Mangalore',
    'Jeppu Mangalore', 'Kuloor Mangalore', 'Mahaveer Circle Mangalore',
    'Nanthoor Mangalore', 'Kavoor Mangalore', 'Derebail Mangalore',
    'Bejai New Road Mangalore',
  ],
  mangalore: null, // alias

  // ──────────────────────────────────────────────────────────────
  //  TIER 2 (additional) — moderate-sized cities
  // ──────────────────────────────────────────────────────────────

  // GHAZIABAD (Uttar Pradesh — NCR)
  ghaziabad: [
    'Ghaziabad', 'Indirapuram Ghaziabad', 'Vaishali Ghaziabad',
    'Vasundhara Ghaziabad', 'Kaushambi Ghaziabad', 'Crossings Republik Ghaziabad',
    'Sahibabad Ghaziabad', 'Raj Nagar Ghaziabad', 'Raj Nagar Extension Ghaziabad',
    'Loni Ghaziabad', 'Model Town Ghaziabad', 'Govindpuram Ghaziabad',
    'Shalimar Garden Ghaziabad', 'Kavi Nagar Ghaziabad',
    'Shastri Nagar Ghaziabad', 'Patel Nagar Ghaziabad',
    'Nehru Nagar Ghaziabad', 'Chiranjiv Vihar Ghaziabad',
    'Pratap Vihar Ghaziabad', 'Mohan Nagar Ghaziabad',
    'Lohia Nagar Ghaziabad', 'Brij Vihar Ghaziabad',
    'Vijay Nagar Ghaziabad', 'Nandgram Ghaziabad',
    'NH24 Ghaziabad', 'Siddharth Vihar Ghaziabad',
    'Dundahera Ghaziabad', 'Niti Khand Ghaziabad',
    'Abhay Khand Ghaziabad', 'Ahinsa Khand Ghaziabad',
    'Shakti Khand Ghaziabad', 'Gyan Khand Ghaziabad',
    'Shipra Suncity Ghaziabad', 'Wave City Ghaziabad',
    'Modinagar Ghaziabad',
  ],

  // HOWRAH (West Bengal)
  howrah: [
    'Howrah', 'Howrah Maidan', 'Shibpur Howrah', 'Bally Howrah',
    'Liluah Howrah', 'Salkia Howrah', 'Ramrajatala Howrah',
    'Kadamtala Howrah', 'Santragachi Howrah', 'Andul Howrah',
    'Dasnagar Howrah', 'Belur Howrah', 'Uluberia Howrah',
    'Bantra Howrah', 'Tikiapara Howrah', 'Jagacha Howrah',
    'Unsani Howrah', 'Dhulagarh Howrah', 'Balitikuri Howrah',
    'Podrah Howrah', 'Nabanna Howrah', 'GT Road Howrah',
    'Golabari Howrah', 'Panchla Howrah', 'Amta Howrah',
    'Ramkrishnapur Howrah', 'Kona Howrah', 'Domjur Howrah',
  ],

  // DHANBAD (Jharkhand)
  dhanbad: [
    'Dhanbad', 'Bank More Dhanbad', 'Bartand Dhanbad',
    'Hirapur Dhanbad', 'Saraidhela Dhanbad', 'Polytechnic Dhanbad',
    'Matkuria Dhanbad', 'Dhansar Dhanbad', 'Jharia Dhanbad',
    'Katras Dhanbad', 'Sindri Dhanbad', 'Jorapokhar Dhanbad',
    'Bhuli Dhanbad', 'Baghmara Dhanbad', 'Govindpur Dhanbad',
    'ISM Dhanbad', 'IIT ISM Dhanbad', 'Kusunda Dhanbad',
    'Tundi Dhanbad', 'Nirsa Dhanbad', 'Chirkunda Dhanbad',
    'Pandarpala Dhanbad', 'City Centre Dhanbad',
  ],

  // SRINAGAR (J&K)
  srinagar: [
    'Srinagar', 'Lal Chowk Srinagar', 'Dalgate Srinagar',
    'Rajbagh Srinagar', 'Hyderpora Srinagar', 'Bemina Srinagar',
    'Batamaloo Srinagar', 'Nowgam Srinagar', 'Jawahar Nagar Srinagar',
    'Rambagh Srinagar', 'Sonwar Srinagar', 'Nishat Srinagar',
    'Shalimar Srinagar', 'Hazratbal Srinagar', 'Soura Srinagar',
    'Bagh e Ali Mardan Srinagar', 'Chanapora Srinagar',
    'Barzulla Srinagar', 'Natipora Srinagar', 'Mehjoor Nagar Srinagar',
    'Sanat Nagar Srinagar', 'Khayam Srinagar', 'Nowhatta Srinagar',
    'Zaina Kadal Srinagar', 'Eidgah Srinagar',
  ],

  // AURANGABAD (Maharashtra — now Chhatrapati Sambhajinagar)
  aurangabad: [
    'Aurangabad', 'CIDCO Aurangabad', 'Jalna Road Aurangabad',
    'Garkheda Aurangabad', 'Osmanpura Aurangabad', 'Samarth Nagar Aurangabad',
    'Padegaon Aurangabad', 'Nakshatrawadi Aurangabad', 'Beed Bypass Aurangabad',
    'Mukundwadi Aurangabad', 'Waluj Aurangabad', 'Chikalthana Aurangabad',
    'N6 Cidco Aurangabad', 'N7 Cidco Aurangabad', 'N11 Cidco Aurangabad',
    'Shahganj Aurangabad', 'Kranti Chowk Aurangabad',
    'Ulkanagari Aurangabad', 'Shahnoor Wadi Aurangabad',
    'Harsul Aurangabad', 'Jyoti Nagar Aurangabad',
    'Satara Parisar Aurangabad', 'Pundalik Nagar Aurangabad',
    'Ashoka Colony Aurangabad', 'Rauza Bagh Aurangabad',
    'Bajaj Nagar Aurangabad',
  ],

  // AMRITSAR (Punjab)
  amritsar: [
    'Amritsar', 'Hall Bazaar Amritsar', 'Lawrence Road Amritsar',
    'Ranjit Avenue Amritsar', 'Green Avenue Amritsar',
    'Majitha Road Amritsar', 'GT Road Amritsar', 'Putlighar Amritsar',
    'Mall Road Amritsar', 'Katra Ahluwalia Amritsar',
    'Katra Jaimal Singh Amritsar', 'Court Road Amritsar',
    'Circular Road Amritsar', 'Chheharta Amritsar',
    'Kot Khalsa Amritsar', 'Islamabad Amritsar', 'Guru Nanak Nagar Amritsar',
    'White Avenue Amritsar', 'Guru Ram Das Nagar Amritsar',
    'Verka Amritsar', 'Rajasansi Amritsar', 'Dhapai Amritsar',
    'Gopal Nagar Amritsar', 'Batala Road Amritsar',
    'Tarn Taran Road Amritsar', 'Airport Road Amritsar',
  ],

  // ALLAHABAD / PRAYAGRAJ (UP)
  prayagraj: [
    'Prayagraj', 'Allahabad', 'Civil Lines Prayagraj',
    'Civil Lines Allahabad', 'Katra Prayagraj', 'George Town Prayagraj',
    'Tagore Town Prayagraj', 'Allenganj Prayagraj', 'Lukerganj Prayagraj',
    'Naini Prayagraj', 'Jhunsi Prayagraj', 'Phaphamau Prayagraj',
    'Mumfordganj Prayagraj', 'Rajrooppur Prayagraj',
    'Teliyarganj Prayagraj', 'Daraganj Prayagraj',
    'Kareli Prayagraj', 'Chowk Prayagraj',
    'Bairahana Prayagraj', 'Katra Allahabad',
    'Colonelganj Prayagraj', 'Jawahar Square Prayagraj',
    'Ashok Nagar Prayagraj', 'Mauaima Prayagraj',
    'Sangam Area Prayagraj', 'Triveni Puram Prayagraj',
  ],

  // RANCHI (Jharkhand)
  ranchi: [
    'Ranchi', 'Main Road Ranchi', 'Circular Road Ranchi',
    'Albert Ekka Chowk Ranchi', 'Kanke Road Ranchi', 'Harmu Ranchi',
    'Lalpur Ranchi', 'Morabadi Ranchi', 'Doranda Ranchi',
    'Hinoo Ranchi', 'Argora Ranchi', 'Bariatu Ranchi',
    'Ratu Road Ranchi', 'Hatia Ranchi', 'Namkum Ranchi',
    'Kokar Ranchi', 'Ashok Nagar Ranchi', 'Pundag Ranchi',
    'Bundu Ranchi', 'Ormanjhi Ranchi', 'Kantatoli Ranchi',
    'Kadru Ranchi', 'Karamtoli Ranchi', 'Lower Chutia Ranchi',
    'Upper Bazaar Ranchi', 'Chutia Ranchi', 'Birsa Chowk Ranchi',
    'Jagannathpur Ranchi',
  ],

  // GWALIOR (Madhya Pradesh)
  gwalior: [
    'Gwalior', 'Lashkar Gwalior', 'Morar Gwalior',
    'City Centre Gwalior', 'Thatipur Gwalior', 'Phoolbagh Gwalior',
    'DD Nagar Gwalior', 'Vinay Nagar Gwalior', 'Gole Ka Mandir Gwalior',
    'Sirol Gwalior', 'Aamkho Gwalior', 'Hazira Gwalior',
    'Naka Chandrabadni Gwalior', 'Murar Gwalior', 'Kampoo Gwalior',
    'Bahodapur Gwalior', 'Sithouli Gwalior', 'Maharajpura Gwalior',
    'Inderganj Gwalior', 'Mahalgaon Gwalior', 'University Gwalior',
    'Gandhi Road Gwalior', 'Sadar Bazaar Gwalior', 'Jayendraganj Gwalior',
    'Madhav Ganj Gwalior', 'Bijoli Gwalior',
  ],

  // JODHPUR (Rajasthan)
  jodhpur: [
    'Jodhpur', 'Sardarpura Jodhpur', 'Ratanada Jodhpur',
    'Shastri Nagar Jodhpur', 'Paota Jodhpur', 'Chopasni Road Jodhpur',
    'Chopasni Housing Board Jodhpur', 'Jhalamand Jodhpur',
    'Basni Jodhpur', 'Pal Road Jodhpur', 'Mandore Jodhpur',
    'Mahamandir Jodhpur', 'Kudi Bhagtasni Jodhpur',
    'Bhadwasiya Jodhpur', 'Banar Jodhpur', 'Sangaria Jodhpur',
    'Soorsagar Jodhpur', 'Ratanada Extension Jodhpur',
    'Air Force Area Jodhpur', 'Heavy Industries Area Jodhpur',
    'Clock Tower Jodhpur', 'Sojati Gate Jodhpur',
    'Jalori Gate Jodhpur', 'Nai Sarak Jodhpur',
    'Raika Bagh Jodhpur', 'High Court Colony Jodhpur',
  ],

  // RAIPUR (Chhattisgarh)
  raipur: [
    'Raipur', 'Pandri Raipur', 'Shankar Nagar Raipur',
    'Civil Lines Raipur', 'Avanti Vihar Raipur', 'Telibandha Raipur',
    'Tatibandh Raipur', 'Amlidih Raipur', 'Shailendra Nagar Raipur',
    'Devendra Nagar Raipur', 'Samta Colony Raipur',
    'VIP Road Raipur', 'Ring Road Raipur', 'Mowa Raipur',
    'Kabir Nagar Raipur', 'Santoshi Nagar Raipur',
    'DD Nagar Raipur', 'Bhatagaon Raipur', 'Pachpedi Naka Raipur',
    'Choubey Colony Raipur', 'Ashoka Ratan Raipur',
    'New Rajendra Nagar Raipur', 'Sundar Nagar Raipur',
    'Gudhiyari Raipur', 'Purani Basti Raipur',
    'Mathpara Raipur', 'Bhanpuri Raipur', 'Raipura Raipur',
    'Shyam Nagar Raipur',
  ],

  // NASHIK (Maharashtra)
  nashik: [
    'Nashik', 'College Road Nashik', 'Gangapur Road Nashik',
    'Panchavati Nashik', 'Indira Nagar Nashik', 'Cidco Nashik',
    'Nashik Road', 'Deolali Nashik', 'Deolali Camp Nashik',
    'Ambad Nashik', 'Satpur Nashik', 'Pathardi Phata Nashik',
    'Adgaon Nashik', 'Dwarka Nashik', 'Tidke Colony Nashik',
    'MG Road Nashik', 'Mahatma Nagar Nashik', 'Ashok Stambh Nashik',
    'Rane Nagar Nashik', 'Mico Circle Nashik', 'Trimbak Road Nashik',
    'Govind Nagar Nashik', 'Pumping Station Nashik',
    'Sharanpur Road Nashik', 'Shivaji Nagar Nashik',
    'Old Nashik', 'Wadala Road Nashik', 'Mumbai Naka Nashik',
    'Jail Road Nashik', 'Untwadi Nashik', 'Makhmalabad Nashik',
    'Pimpalgaon Nashik', 'Sinnar Nashik',
  ],

  // FARIDABAD (Haryana — NCR)
  faridabad: [
    'Faridabad', 'Sector 15 Faridabad', 'Sector 16 Faridabad',
    'Sector 21 Faridabad', 'Sector 28 Faridabad', 'Sector 29 Faridabad',
    'Sector 37 Faridabad', 'Sector 41 Faridabad', 'Sector 46 Faridabad',
    'Sector 55 Faridabad', 'Sector 65 Faridabad', 'Sector 75 Faridabad',
    'Sector 86 Faridabad', 'Sector 88 Faridabad', 'Sector 89 Faridabad',
    'NIT Faridabad', 'NIT 1 Faridabad', 'NIT 3 Faridabad',
    'Ballabgarh Faridabad', 'Old Faridabad', 'New Industrial Township Faridabad',
    'Surya Nagar Faridabad', 'Ashoka Enclave Faridabad',
    'Mathura Road Faridabad', 'Neelam Chowk Faridabad',
    'SGM Nagar Faridabad', 'Sanjay Colony Faridabad',
    'Jasana Road Faridabad', 'Tigaon Road Faridabad',
    'Badshahpur Faridabad', 'Palla Faridabad', 'Charmwood Village Faridabad',
    'Greenfields Faridabad', 'Green Valley Faridabad',
  ],

  // MEERUT (Uttar Pradesh)
  meerut: [
    'Meerut', 'Meerut Cantonment', 'Begum Bridge Meerut',
    'Shastri Nagar Meerut', 'Saket Meerut', 'Pallavpuram Meerut',
    'Modipuram Meerut', 'Ganga Nagar Meerut', 'Jagriti Vihar Meerut',
    'Mangal Pandey Nagar Meerut', 'Abu Lane Meerut', 'Sadar Bazaar Meerut',
    'Bagpat Road Meerut', 'Delhi Road Meerut', 'Garh Road Meerut',
    'Hapur Road Meerut', 'Roorkee Road Meerut',
    'Rithani Meerut', 'Pandav Nagar Meerut', 'Brahmpuri Meerut',
    'Lalkurti Meerut', 'Mohalla Naukuan Meerut', 'Kankerkheda Meerut',
    'Kaseru Buxar Meerut', 'Jani Khurd Meerut', 'Ganganagar Meerut',
    'Shyam Nagar Meerut',
  ],

  // LUDHIANA (Punjab)
  ludhiana: [
    'Ludhiana', 'Model Town Ludhiana', 'Model Town Extension Ludhiana',
    'Civil Lines Ludhiana', 'Sarabha Nagar Ludhiana', 'BRS Nagar Ludhiana',
    'Dugri Ludhiana', 'Phase 1 Dugri', 'Phase 2 Dugri',
    'Gill Road Ludhiana', 'Ferozepur Road Ludhiana',
    'Pakhowal Road Ludhiana', 'Jalandhar Bypass Ludhiana',
    'Chandigarh Road Ludhiana', 'Rajguru Nagar Ludhiana',
    'Aggar Nagar Ludhiana', 'Kitchlu Nagar Ludhiana',
    'Ghumar Mandi Ludhiana', 'Chaura Bazar Ludhiana',
    'Kochar Market Ludhiana', 'Clock Tower Ludhiana',
    'Bhai Randhir Singh Nagar Ludhiana', 'Dhandari Kalan Ludhiana',
    'Shivpuri Ludhiana', 'Shimla Puri Ludhiana',
    'Focal Point Ludhiana', 'Basti Jodhewal Ludhiana',
    'Haibowal Kalan Ludhiana', 'Threeka Ludhiana',
    'New Shakti Nagar Ludhiana', 'Guru Nanak Nagar Ludhiana',
    'Daba Road Ludhiana', 'Tagore Nagar Ludhiana',
    'Jamalpur Ludhiana',
  ],

  // AGRA (Uttar Pradesh)
  agra: [
    'Agra', 'Sadar Bazaar Agra', 'Taj Ganj Agra', 'Dayal Bagh Agra',
    'Kamla Nagar Agra', 'Shahganj Agra', 'Sanjay Place Agra',
    'Fatehabad Road Agra', 'MG Road Agra', 'Civil Lines Agra',
    'Sikandra Agra', 'Tajganj Agra', 'Pratappura Agra',
    'Trans Yamuna Agra', 'Shastripuram Agra', 'Khandari Agra',
    'Mantola Agra', 'Kheria Agra', 'Bodla Agra',
    'Jaipur House Agra', 'Rajpur Chungi Agra',
    'Kotwali Agra', 'Balkeshwar Agra', 'Belanganj Agra',
    'New Agra', 'Vijay Nagar Agra', 'Khatik Pada Agra',
    'Gwalior Road Agra', 'Bhagwan Talkies Agra',
  ],

  // RAJKOT (Gujarat)
  rajkot: [
    'Rajkot', 'Kalawad Road Rajkot', '150 Feet Ring Road Rajkot',
    'University Road Rajkot', 'Race Course Rajkot', 'Raiya Road Rajkot',
    'Yagnik Road Rajkot', 'Gondal Road Rajkot', 'Bhakti Nagar Rajkot',
    'Nirmala Rajkot', 'Sadar Rajkot', 'Mavdi Rajkot',
    'Morbi Road Rajkot', 'Jamnagar Road Rajkot', 'Saurashtra University Rajkot',
    'Aji Dam Rajkot', 'Amin Marg Rajkot', 'Dhebar Road Rajkot',
    'Gundawadi Rajkot', 'Popatpara Rajkot', 'Karansinhji Road Rajkot',
    'Lodhawad Rajkot', 'Malviya Nagar Rajkot', 'Panchayat Nagar Rajkot',
    'Bhavnagar Road Rajkot', 'Dhoraji Road Rajkot',
  ],

  // BAREILLY (Uttar Pradesh)
  bareilly: [
    'Bareilly', 'Civil Lines Bareilly', 'Cantonment Bareilly',
    'Rampur Garden Bareilly', 'Subhash Nagar Bareilly',
    'Krishna Nagar Bareilly', 'Green Park Bareilly',
    'Nainital Road Bareilly', 'Pilibhit Road Bareilly',
    'Badaun Road Bareilly', 'Shahjahanpur Road Bareilly',
    'Rajendra Nagar Bareilly', 'Mahanagar Bareilly',
    'Karmacharinagar Bareilly', 'Azad Nagar Bareilly',
    'Kohadapir Bareilly', 'Qila Bareilly', 'Ayub Khan Chowk Bareilly',
    'Prem Nagar Bareilly', 'Model Town Bareilly',
    'Bada Bazaar Bareilly',
  ],

  // MORADABAD (UP)
  moradabad: [
    'Moradabad', 'Civil Lines Moradabad', 'Buddhi Vihar Moradabad',
    'Ramganga Vihar Moradabad', 'Deen Dayal Nagar Moradabad',
    'TDI City Moradabad', 'Majhola Moradabad', 'Delhi Road Moradabad',
    'Ashiana Moradabad', 'Lajpat Nagar Moradabad', 'Prem Nagar Moradabad',
    'Nawabpura Moradabad', 'Mughalpura Moradabad',
    'Kanth Road Moradabad', 'Rampur Road Moradabad',
    'Sambhal Road Moradabad', 'Harthala Moradabad',
    'Karula Moradabad', 'Kashiram Nagar Moradabad',
    'Chak Hussain Moradabad',
  ],

  // KOTA (Rajasthan)
  kota: [
    'Kota', 'Vigyan Nagar Kota', 'Talwandi Kota', 'Rajiv Gandhi Nagar Kota',
    'Indraprastha Kota', 'Jawahar Nagar Kota', 'Mahaveer Nagar Kota',
    'Dadabari Kota', 'Shopping Centre Kota', 'Chambal Garden Kota',
    'Aerodrome Circle Kota', 'Gumanpura Kota', 'Station Road Kota',
    'Borkhera Kota', 'Nayapura Kota', 'Bhimganjmandi Kota',
    'Landmark City Kota', 'Kaithoon Kota', 'Mala Road Kota',
    'Rangbari Kota', 'Road No 1 Kota', 'Jhalawar Road Kota',
    'Kunhari Kota', 'Rampura Kota',
  ],

  // SOLAPUR (Maharashtra)
  solapur: [
    'Solapur', 'Hotgi Road Solapur', 'Vijapur Road Solapur',
    'Vijay Nagar Solapur', 'Sakhar Peth Solapur',
    'Khadaki Peth Solapur', 'Mangalwar Peth Solapur',
    'Indira Nagar Solapur', 'Railway Lines Solapur',
    'Civil Lines Solapur', 'Navi Peth Solapur',
    'Damani Nagar Solapur', 'Saiful Solapur',
    'Majarewadi Solapur', 'Majrewadi Solapur', 'Akkalkot Road Solapur',
    'Pune Naka Solapur', 'Jule Solapur', 'Barshi Road Solapur',
    'Kegaon Solapur', 'Hotgi Solapur',
  ],

  // HUBLI (Karnataka)
  hubli: [
    'Hubli', 'Dharwad', 'Hubballi', 'Gokul Road Hubli',
    'Vidya Nagar Hubli', 'Keshwapur Hubli', 'Deshpande Nagar Hubli',
    'Navanagar Hubli', 'Unkal Hubli', 'Rayapur Hubli',
    'Old Hubli', 'Traffic Island Hubli', 'Koppikar Road Hubli',
    'Nehru Nagar Hubli', 'Gokul Hubli', 'Tarihal Hubli',
    'Gandhi Chowk Hubli', 'Lamington Road Hubli',
    'BVB College Road Hubli', 'PB Road Dharwad', 'Saptapur Dharwad',
    'Vidyagiri Dharwad', 'Jubilee Circle Dharwad',
  ],

  // BELGAUM / BELAGAVI (Karnataka)
  belagavi: [
    'Belagavi', 'Belgaum', 'Tilakwadi Belgaum', 'Shahapur Belgaum',
    'Camp Belgaum', 'Khasbag Belgaum', 'Club Road Belgaum',
    'Fort Road Belgaum', 'RPD Cross Belgaum', 'Nehru Nagar Belgaum',
    'Angol Belgaum', 'Udyambag Belgaum', 'Majgaon Belgaum',
    'Vadgaon Belgaum', 'Shivbasav Nagar Belgaum',
    'Bhagya Nagar Belgaum', 'Hindwadi Belgaum',
    'Ramdev Galli Belgaum', 'Ganeshpur Belgaum', 'Kakati Belgaum',
    'Khanapur Belgaum',
  ],

  // SALEM (Tamil Nadu)
  salem: [
    'Salem', 'Fairlands Salem', 'Hasthampatti Salem',
    'Shevapet Salem', 'Suramangalam Salem', 'Ammapet Salem',
    'Fort Salem', 'Kondalampatti Salem', 'Alagapuram Salem',
    'Kichipalayam Salem', 'Seelanaickenpatti Salem',
    'Attayampatti Salem', 'Omalur Salem', 'Mettur Salem',
    'Sankari Salem', 'Edappadi Salem', 'Yercaud Salem',
    'Gorimedu Salem', 'Swarnapuri Salem',
    'Bharathi Street Salem', 'New Bus Stand Salem',
    'Junction Main Road Salem', 'Kitchipalayam Salem',
    'Narasothipatti Salem',
  ],

  // TIRUNELVELI (Tamil Nadu)
  tirunelveli: [
    'Tirunelveli', 'Palayamkottai Tirunelveli', 'Melapalayam Tirunelveli',
    'Pettai Tirunelveli', 'Vannarpettai Tirunelveli',
    'Maharaja Nagar Tirunelveli', 'Perumalpuram Tirunelveli',
    'Reddiyarpatti Tirunelveli', 'Thachanallur Tirunelveli',
    'Gangaikondan Tirunelveli', 'Tuticorin Road Tirunelveli',
    'Nellaiappar Tirunelveli', 'Kokkirakulam Tirunelveli',
    'Murugankurichi Tirunelveli', 'VK Puram Tirunelveli',
    'Sankar Nagar Tirunelveli', 'Ambai Road Tirunelveli',
    'Thirukkural Nagar Tirunelveli',
  ],

  // VELLORE (Tamil Nadu)
  vellore: [
    'Vellore', 'Katpadi Vellore', 'Gandhi Nagar Vellore',
    'Thottapalayam Vellore', 'Sathuvachari Vellore',
    'Viruthampet Vellore', 'Ariyur Vellore', 'Bagayam Vellore',
    'Konavattam Vellore', 'Thiruvalam Vellore', 'Vallalar Nagar Vellore',
    'Sripuram Vellore', 'Ranipet Vellore', 'Arcot Vellore',
    'Gudiyatham Vellore', 'Ambur Vellore', 'Vaniyambadi Vellore',
    'CMC Vellore', 'VIT Vellore', 'Palar Nagar Vellore',
  ],

  // JABALPUR (MP)
  jabalpur: [
    'Jabalpur', 'Civil Lines Jabalpur', 'Wright Town Jabalpur',
    'Napier Town Jabalpur', 'Vijay Nagar Jabalpur',
    'South Avenue Jabalpur', 'Garha Jabalpur', 'Adhartal Jabalpur',
    'Gorakhpur Jabalpur', 'Ranjhi Jabalpur', 'Gwarighat Jabalpur',
    'Sadar Jabalpur', 'Cantonment Jabalpur', 'Russel Chowk Jabalpur',
    'Madan Mahal Jabalpur', 'Hanumantal Jabalpur',
    'Karamchand Chowk Jabalpur', 'Cherital Jabalpur',
    'Madhotal Jabalpur', 'Katanga Jabalpur', 'Tilwara Jabalpur',
    'Kachnar City Jabalpur', 'Khamaria Jabalpur',
    'Richai Jabalpur', 'Shahpura Jabalpur',
  ],

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
    'Mankammathota Karimnagar', 'Ashok Nagar Karimnagar',
    'Kothapet Karimnagar', 'Subhash Nagar Karimnagar',
    'Ramnagar Karimnagar', 'Bommakal Karimnagar',
    'Vavilalapally Karimnagar', 'Theegalaguttapalli Karimnagar',
    'Rekurthi Karimnagar',
  ],

  nizamabad: [
    'Nizamabad', 'Bodhan Nizamabad', 'Armoor Nizamabad',
    'Banswada Nizamabad', 'Kamareddy Nizamabad',
    'Dichpally Nizamabad', 'Yellareddy Nizamabad',
    'Varni Nizamabad', 'Balkonda Nizamabad',
    'Koratpally Nizamabad', 'Mosra Nizamabad',
    'Khanapur Nizamabad', 'Dubba Nizamabad',
    'Subhash Nagar Nizamabad', 'Kantheswar Nizamabad',
    'Housing Board Colony Nizamabad', 'Khaleelwadi Nizamabad',
    'Vinayak Nagar Nizamabad', 'Saraswati Nagar Nizamabad',
    'Tilak Garden Nizamabad',
  ],

  khammam: [
    'Khammam', 'Kothagudem Khammam', 'Bhadrachalam Khammam',
    'Yellandu Khammam', 'Sattupally Khammam',
    'Madhira Khammam', 'Wyra Khammam',
    'Burgampadu Khammam', 'Manuguru Khammam',
    'Bank Colony Khammam', 'Gandhi Chowk Khammam',
    'Mustafanagar Khammam', 'Bonakal Khammam',
    'Kusumanchi Khammam', 'Paloncha Khammam',
    'Ballepalli Khammam', 'Illendu Khammam',
    'Nelakondapalli Khammam', 'Raghunathpalem Khammam',
    'Hanuman Nagar Khammam',
  ],

  nalgonda: [
    'Nalgonda', 'Suryapet Nalgonda', 'Miryalaguda Nalgonda',
    'Bhongir Nalgonda', 'Devarakonda Nalgonda',
    'Kodad Nalgonda', 'Nakrekal Nalgonda',
    'Nidamanoor Nalgonda', 'Chityala Nalgonda',
    'Choutuppal Nalgonda', 'Huzurnagar Nalgonda',
    'Yadagirigutta Nalgonda', 'Narketpally Nalgonda',
    'Thipparthy Nalgonda', 'Ramannapet Nalgonda',
  ],

  mahbubnagar: [
    'Mahbubnagar', 'Jadcherla Mahbubnagar', 'Narayanpet Mahbubnagar',
    'Wanaparthy Mahbubnagar', 'Gadwal Mahbubnagar',
    'Kalwakurthy Mahbubnagar', 'Mahabubnagar',
    'Kollapur Mahbubnagar', 'Achampet Mahbubnagar',
    'Kosgi Mahbubnagar', 'Nagarkurnool Mahbubnagar',
    'Shadnagar Mahbubnagar', 'Bhoothpur Mahbubnagar',
    'Balanagar Mahbubnagar', 'Farooqnagar Mahbubnagar',
  ],

  // Andhra Pradesh — Tier 3
  rajahmundry: [
    'Rajahmundry', 'Kakinada', 'Amalapuram Rajahmundry',
    'Tanuku Rajahmundry', 'Nidadavole Rajahmundry',
    'Rajam Rajahmundry', 'Mandapeta Rajahmundry',
    'Kovvur Rajahmundry', 'Diwancheruvu Rajahmundry',
    'Morampudi Rajahmundry', 'Danavaipeta Rajahmundry',
    'Tilak Road Rajahmundry', 'Innispeta Rajahmundry',
    'Syamala Nagar Rajahmundry', 'Katheru Rajahmundry',
    'Alcot Gardens Rajahmundry', 'Gandhipuram Rajahmundry',
    'Subba Rao Nagar Rajahmundry', 'Ramachandra Nagar Rajahmundry',
    'Dowleswaram Rajahmundry',
  ],

  kakinada: [
    'Kakinada', 'Samalkot Kakinada', 'Pithapuram Kakinada',
    'Tuni Kakinada', 'Prathipadu Kakinada',
    'Jagannaickpur Kakinada', 'Ramaraopeta Kakinada',
    'Bhanugudi Junction Kakinada', 'Sarpavaram Kakinada',
    'Suryaraopeta Kakinada', 'Gandhinagar Kakinada',
    'Venkatnagar Kakinada', 'Kakinada Port', 'Vakalapudi Kakinada',
    'Madhavapatnam Kakinada', 'Indrapalem Kakinada',
    'Ramanaiah Peta Kakinada', 'Peddapuram Kakinada',
    'Yetimoga Kakinada', 'Turangi Kakinada',
  ],

  anantapur: [
    'Anantapur', 'Hindupur Anantapur', 'Dharmavaram Anantapur',
    'Guntakal Anantapur', 'Kadiri Anantapur',
    'Madanapalle Anantapur', 'Tadipatri Anantapur',
    'Penukonda Anantapur', 'Puttaparthi Anantapur',
    'Kalyandurg Anantapur', 'Rayadurg Anantapur',
    'Gooty Anantapur', 'Uravakonda Anantapur',
    'Singanamala Anantapur', 'Pamidi Anantapur',
  ],

  kadapa: [
    'Kadapa', 'Proddatur Kadapa', 'Nandyal Kadapa',
    'Badvel Kadapa', 'Rajampet Kadapa',
    'Jammalamadugu Kadapa', 'Pulivendula Kadapa',
    'Mydukur Kadapa', 'Yerraguntla Kadapa',
    'Rayachoti Kadapa', 'Kamalapuram Kadapa',
    'Lakkireddipalli Kadapa', 'Vempalli Kadapa',
    'Sidhout Kadapa', 'Chennur Kadapa',
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
