const bcrypt = require('bcryptjs');
const campusConfig = require('./campusConfig');

function seed(db) {
  // Clear any existing tables if called independently
  db.prepare('DELETE FROM event_registrations').run();
  db.prepare('DELETE FROM issue_votes').run();
  db.prepare('DELETE FROM canteen_votes').run();
  db.prepare('DELETE FROM issues').run();
  db.prepare('DELETE FROM lost_found').run();
  db.prepare('DELETE FROM events').run();
  db.prepare('DELETE FROM places').run();
  db.prepare('DELETE FROM canteen_menu').run();
  db.prepare('DELETE FROM bus_routes').run();
  db.prepare('DELETE FROM emergency_contacts').run();
  db.prepare('DELETE FROM users').run();

  // Reset sqlite sequences
  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('users', 'places', 'events', 'event_registrations', 'issues', 'issue_votes', 'lost_found', 'canteen_menu', 'canteen_votes', 'bus_routes', 'emergency_contacts')").run();
  } catch (e) {
    // sqlite_sequence might not exist yet if fresh DB
  }

  // 1. Users
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const studentPasswordHash = bcrypt.hashSync('student123', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
  `);

  const adminResult = insertUser.run('Admin Incharge', 'admin@campus.com', adminPasswordHash, 'admin');
  const studentResult = insertUser.run('Aarav Sharma', 'student@campus.com', studentPasswordHash, 'student');
  const student2Result = insertUser.run('Priya Patel', 'priya@campus.com', studentPasswordHash, 'student');
  const student3Result = insertUser.run('Rohan Verma', 'rohan@campus.com', studentPasswordHash, 'student');

  const adminId = adminResult.lastInsertRowid;
  const studentId = studentResult.lastInsertRowid;
  const priyaId = student2Result.lastInsertRowid;
  const rohanId = student3Result.lastInsertRowid;

  // 2. Places (~15 places across types)
  const insertPlace = db.prepare(`
    INSERT INTO places (name, type, building, floor, description, status, route_directions, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const placesData = [
    [
      'Central Library Charging Lounge',
      'Charging',
      campusConfig.buildings[4], // Central Library
      '1st Floor',
      'High-speed multi-socket power hub with USB-C ports, work desks, and ergonomic chairs.',
      'Available',
      'Enter Library main lobby, take staircase to 1st Floor, turn right past the periodicals rack.',
      '-5 minutes'
    ],
    [
      'SAC Tech Lounge Charging Bar',
      'Charging',
      campusConfig.buildings[5], // Student Activity Center
      'Ground Floor',
      'Wall-mounted charging stations with universal adapters and high barstools.',
      'Busy',
      'From SAC entrance, head straight towards the indoor games zone; station is along the south glass wall.',
      '-15 minutes'
    ],
    [
      'Ramanujan Lab 304 Power Benches',
      'Charging',
      campusConfig.buildings[1], // Ramanujan IT Block
      '3rd Floor',
      'High capacity power strips with surge protection for laptops and dev boards.',
      'Available',
      'Take Ramanujan elevator to Floor 3, turn left, located outside Advanced Computing Lab 304.',
      '-35 minutes'
    ],
    [
      'Main Food Court & Cafeteria',
      'Food',
      campusConfig.buildings[5], // SAC
      'Ground Floor',
      'Spacious indoor dining with South Indian, North Indian, fresh juices, and chat counters.',
      'Busy',
      'Central campus square, prominent glass facade with outdoor seating canopy.',
      '-8 minutes'
    ],
    [
      'Nescafe Campus Cafe',
      'Food',
      campusConfig.buildings[4], // Library
      'Ground Floor',
      'Hot coffee, iced tea, sandwiches, muffins, and quick munchies.',
      'Available',
      'Adjacent to the Central Library portico, under the shade trees.',
      '-12 minutes'
    ],
    [
      'Amul Ice Cream & Snacks Kiosk',
      'Food',
      campusConfig.buildings[3], // Visvesvaraya Tech Center
      'Ground Floor',
      'Dairy shakes, ice cream sundaes, cold milk, and quick snacks.',
      'Available',
      'Opposite Visvesvaraya Mechanical Workshop courtyard.',
      '-2 minutes'
    ],
    [
      'Aryabhata Restrooms (East Wing)',
      'Washroom',
      campusConfig.buildings[0], // Aryabhata Academic Block
      'Ground Floor',
      'Cleaned hourly, accessible facilities, automated sensor taps and soap dispensers.',
      'Available',
      'Enter Aryabhata main porch, proceed down east corridor past Dean Office.',
      '-20 minutes'
    ],
    [
      'Visvesvaraya 2nd Floor Restrooms',
      'Washroom',
      campusConfig.buildings[3], // Visvesvaraya Tech Center
      '2nd Floor',
      'Well-maintained washroom complex with mirrors and hand dryers.',
      'Busy',
      'Take center stairs to Level 2, corridor adjacent to CAD Modeling Lab.',
      '-45 minutes'
    ],
    [
      'Silent Reading Sanctuary',
      'Study',
      campusConfig.buildings[4], // Central Library
      '2nd Floor',
      'Strictly silent air-conditioned study hall with individual cubicles and reading lamps.',
      'Available',
      'Library main staircase to 2nd Floor, push through soundproof glass doors on your left.',
      '-18 minutes'
    ],
    [
      'Kalam Open Garden Study Pavilion',
      'Study',
      campusConfig.buildings[2], // Kalam Science Block
      'Courtyard',
      'Shaded open-air pergolas with high-speed campus Wi-Fi and solar charging benches.',
      'Available',
      'Walk behind Kalam Science Center towards the herbal botanical garden.',
      '-50 minutes'
    ],
    [
      'Aryabhata Reprographics & Printing Center',
      'Printing',
      campusConfig.buildings[0], // Aryabhata Block
      'Ground Floor',
      'High-speed B/W & color printing, spiral binding, thesis hardbinding, and stationery.',
      'Busy',
      'Aryabhata Block basement ramp entrance, Shop No. 2 next to the post kiosk.',
      '-10 minutes'
    ],
    [
      'Library Digital Self-Print Station',
      'Printing',
      campusConfig.buildings[4], // Central Library
      '1st Floor',
      'Automated cloud print kiosks: scan QR code via mobile and print assignments instantly.',
      'Available',
      'Library 1st floor information desk, right beside the reference catalog terminals.',
      '-4 minutes'
    ],
    [
      'Ramanujan RO Purified AquaHub',
      'Water',
      campusConfig.buildings[1], // Ramanujan IT Block
      'Ground Floor',
      '5-stage RO chilled and normal UV-treated drinking water station with bottle refills.',
      'Available',
      'Directly opposite the central elevator bank on Ground Floor.',
      '-7 minutes'
    ],
    [
      'Sports Complex RO Chilled Fountain',
      'Water',
      campusConfig.buildings[6], // Sports Pavilion
      'Ground Floor',
      'High-flow chilled sports drinking water station with foot pedal activation.',
      'Available',
      'Between the badminton courts and the fitness gym reception.',
      '-25 minutes'
    ],
    [
      'Two-Wheeler Student Parking Bay (Gate 2)',
      'Parking',
      campusConfig.buildings[5], // Near SAC
      'Ground Level',
      'Shaded asphalt parking for 600+ bikes and scooters with CCTV surveillance.',
      'Full',
      'Enter from North Gate 2, take immediate left following the two-wheeler signage.',
      '-14 minutes'
    ],
    [
      'Visitor & Four-Wheeler Main Lot (Gate 1)',
      'Parking',
      campusConfig.buildings[0], // Near Aryabhata
      'Ground Level',
      'Marked car parking bays with security guard assistance.',
      'Available',
      'Enter from Campus Main Gate 1, follow the main boulevard 100 meters on the right.',
      '-30 minutes'
    ]
  ];

  placesData.forEach(p => insertPlace.run(...p));

  // 3. Events (6 events: Today, Tomorrow, and Later relative to dynamic date)
  const now = new Date();
  const formatYMD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatYMD(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatYMD(tomorrowDate);
  const laterDate1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const laterStr1 = formatYMD(laterDate1);
  const laterDate2 = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const laterStr2 = formatYMD(laterDate2);

  const insertEvent = db.prepare(`
    INSERT INTO events (title, category, location, event_date, event_time, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const event1 = insertEvent.run(
    'HackAIT 2026: 24-Hour Campus Hackathon',
    'Technical',
    'Ramanujan Computing Hall 401',
    todayStr,
    '10:00 AM',
    'Build innovative web, AI, and IoT solutions. Mentors from top tech companies, cash prizes worth ₹1,00,000, and free food & drinks throughout the night.',
    adminId
  );

  const event2 = insertEvent.run(
    'AI & Robotics Hands-on Masterclass',
    'Workshop',
    'Kalam Seminar Hall 1',
    todayStr,
    '03:30 PM',
    'Learn ROS2, computer vision, and deploy edge models to autonomous rovers. Bring your laptops with Ubuntu or WSL installed.',
    adminId
  );

  const event3 = insertEvent.run(
    'Inter-Department Badminton Championship Finals',
    'Sports',
    'Indoor Sports Pavilion Court 1',
    tomorrowStr,
    '09:30 AM',
    'Cheer for your department in the grand finals: CSE vs Mechanical in Men Singles and ECE vs Civil in Doubles!',
    adminId
  );

  const event4 = insertEvent.run(
    'Campus Placements & Resume Clinic by Google Alumni',
    'Career & Placement',
    'Aryabhata Auditorium',
    tomorrowStr,
    '04:00 PM',
    'Mock technical interview walk-throughs, resume teardowns, and networking session with alumni currently working at FAANG.',
    adminId
  );

  const event5 = insertEvent.run(
    'Dhruva 2026: Annual Inter-College Cultural Fest',
    'Cultural',
    'Open Air Amphitheatre',
    laterStr1,
    '05:00 PM',
    'Battle of the Bands, Fashion Show, Classical Dance Face-off, and Celebrity Pro-Night live concert.',
    adminId
  );

  const event6 = insertEvent.run(
    'Google Developer Student Clubs: Cloud Sprint',
    'Club Activity',
    'Library Tech Center Lab B',
    laterStr2,
    '02:00 PM',
    'Get hands-on cloud credits, deploy containerized microservices, and earn Google Cloud skill badges.',
    adminId
  );

  // Seed sample registrations
  const insertReg = db.prepare(`INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)`);
  insertReg.run(event1.lastInsertRowid, studentId);
  insertReg.run(event1.lastInsertRowid, priyaId);
  insertReg.run(event1.lastInsertRowid, rohanId);
  insertReg.run(event2.lastInsertRowid, studentId);
  insertReg.run(event2.lastInsertRowid, priyaId);
  insertReg.run(event4.lastInsertRowid, studentId);

  // 4. Issues (5 sample issues with different statuses)
  const insertIssue = db.prepare(`
    INSERT INTO issues (block, category, description, photo_url, status, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  const issue1 = insertIssue.run(
    campusConfig.buildings[0], // Aryabhata
    'fan',
    'Ceiling fan #3 wobbling vigorously and emitting high-pitch screeching in Lecture Hall 204.',
    null,
    'In Progress',
    studentId,
    '-2 hours',
    '-30 minutes'
  );

  const issue2 = insertIssue.run(
    campusConfig.buildings[4], // Library
    'water leakage',
    'Water cooler drainage pipe loose on 2nd Floor reading zone; pooling water near power boards.',
    null,
    'Reported',
    priyaId,
    '-5 hours',
    '-5 hours'
  );

  const issue3 = insertIssue.run(
    campusConfig.buildings[1], // Ramanujan IT Block
    'light',
    'Four LED tube lights flickering continuously above Lab 301 workstation row 3.',
    null,
    'Resolved',
    rohanId,
    '-1 day',
    '-2 hours'
  );

  const issue4 = insertIssue.run(
    campusConfig.buildings[5], // SAC
    'washroom',
    'Door latch broken on cubicle 2 and washbasin faucet leaking continuously in 1st Floor East Restroom.',
    null,
    'Reported',
    studentId,
    '-3 hours',
    '-3 hours'
  );

  const issue5 = insertIssue.run(
    campusConfig.buildings[2], // Kalam Science Block
    'furniture',
    'Two auditorium folding chairs have splintered wooden armrests in Physics Hall 102.',
    null,
    'In Progress',
    studentId,
    '-6 hours',
    '-1 hour'
  );

  // Seed sample issue upvotes
  const insertIssueVote = db.prepare(`INSERT INTO issue_votes (issue_id, user_id) VALUES (?, ?)`);
  insertIssueVote.run(issue1.lastInsertRowid, studentId);
  insertIssueVote.run(issue1.lastInsertRowid, priyaId);
  insertIssueVote.run(issue1.lastInsertRowid, rohanId);

  insertIssueVote.run(issue2.lastInsertRowid, priyaId);
  insertIssueVote.run(issue2.lastInsertRowid, studentId);
  insertIssueVote.run(issue2.lastInsertRowid, rohanId);
  insertIssueVote.run(issue2.lastInsertRowid, adminId);

  insertIssueVote.run(issue4.lastInsertRowid, studentId);
  insertIssueVote.run(issue4.lastInsertRowid, priyaId);

  // 5. Lost & Found (4 sample items)
  const insertLostFound = db.prepare(`
    INSERT INTO lost_found (type, title, category, description, location, photo_url, contact_info, status, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertLostFound.run(
    'Lost',
    'Matte Black Fastrack Watch',
    'other',
    'Lost black dial wristwatch with red seconds needle, likely left near basketball bleachers.',
    'Sports Complex Outdoor Bleachers',
    null,
    'Call Aarav: +91 98765 43210 or DM @aarav_s',
    'Open',
    studentId,
    '-4 hours'
  );

  insertLostFound.run(
    'Found',
    'Calculus & Analytical Geometry (Thomas 14th Ed)',
    'book',
    'Found hardcover math book with student notes inside on 2nd floor desk.',
    'Central Library 2nd Floor Desk 42',
    null,
    'Deposited at Central Library Circulation Desk',
    'Open',
    priyaId,
    '-6 hours'
  );

  insertLostFound.run(
    'Lost',
    'Boat Airdopes 141 (Black Case with Batman sticker)',
    'earphones',
    'Left charging case with both wireless earbuds on cafeteria corner booth during lunch.',
    'Main Food Court Table 12',
    null,
    'Contact Rohan: rohan.v@campus.com / 98765 11223',
    'Open',
    rohanId,
    '-8 hours'
  );

  insertLostFound.run(
    'Found',
    'Official College ID Card - 4th Sem Mechanical',
    'ID card',
    'Found student smart ID card on the staircase between 1st and 2nd floor.',
    'Aryabhata Block Main Staircase',
    null,
    'Handed over to Security Gate 1 guard room',
    'Returned / Claimed',
    adminId,
    '-1 day'
  );

  // 6. Canteen Menu Items (realistic Indian college canteen with ₹ prices)
  const insertMenuItem = db.prepare(`
    INSERT INTO canteen_menu (item, category, price, available)
    VALUES (?, ?, ?, ?)
  `);

  const menuItems = [
    ['Crispy Masala Dosa with Sambar & Chutney', 'Breakfast', 50, 1],
    ['Steamed Idli & Medu Vada Combo (2+1)', 'Breakfast', 40, 1],
    ['Fresh Veg Samosa (Plate of 2 pcs)', 'Snacks', 25, 1],
    ['Paneer Tikka Kathi Roll', 'Snacks', 70, 1],
    ['Special South Indian Executive Thali', 'Meals', 90, 1],
    ['Homestyle Rajma Chawal Bowl', 'Meals', 75, 1],
    ['Delhi Style Chole Bhature (2 pcs)', 'Meals', 80, 1],
    ['Cheese Veg Grilled Sandwich', 'Snacks', 55, 1],
    ['Authentic Filter Kaapi', 'Beverages', 20, 1],
    ['Chilled Thick Cold Coffee with Ice Cream', 'Beverages', 40, 1],
    ['Fresh Nimbu Soda (Sweet & Salt)', 'Beverages', 30, 1],
    ['Mumbai Special Butter Pav Bhaji', 'Snacks', 65, 0] // 0: out of stock
  ];

  menuItems.forEach(item => insertMenuItem.run(...item));

  // 7. Canteen Crowd Votes (recent votes within last 20 minutes)
  const insertCrowdVote = db.prepare(`
    INSERT INTO canteen_votes (user_id, level, created_at)
    VALUES (?, ?, datetime('now', ?))
  `);

  insertCrowdVote.run(studentId, 'Medium', '-12 minutes');
  insertCrowdVote.run(priyaId, 'Medium', '-8 minutes');
  insertCrowdVote.run(rohanId, 'Low', '-3 minutes');

  // 8. Bus Routes (5 routes with realistic timings)
  const insertBus = db.prepare(`
    INSERT INTO bus_routes (route_number, destination, pickup_point, timings, active_days)
    VALUES (?, ?, ?, ?, ?)
  `);

  const busData = [
    [
      'Route 101',
      'Electronic City via Silk Board & Bommanahalli',
      'Campus Gate 1 Bus Bay',
      '07:15, 08:30, 12:45, 16:30, 18:00, 19:15',
      'Mon-Sat'
    ],
    [
      'Route 102',
      'Majestic City Railway Station via Malleshwaram',
      'Campus Gate 1 Bus Bay',
      '07:00, 08:15, 13:00, 16:45, 18:15, 19:30',
      'Mon-Sat'
    ],
    [
      'Route 103',
      'Whitefield & ITPL via Marathahalli Bridge',
      'Campus Gate 2 Bus Bay',
      '07:20, 08:20, 13:15, 17:00, 18:30',
      'Mon-Sat'
    ],
    [
      'Route 104',
      'Hebbal & Yelahanka Satellite Town via Outer Ring Road',
      'Campus Gate 2 Bus Bay',
      '07:10, 08:05, 12:30, 16:15, 17:45',
      'Mon-Sat'
    ],
    [
      'Route 105',
      'Banashankari & Jayanagar 4th Block via South End Circle',
      'Campus Gate 1 Bus Bay',
      '07:25, 08:25, 13:30, 16:50, 18:20',
      'Mon-Sat'
    ]
  ];

  busData.forEach(b => insertBus.run(...b));

  // 9. Emergency Contacts (4 contacts with tap-to-call)
  const insertContact = db.prepare(`
    INSERT INTO emergency_contacts (title, number, location, available_hours)
    VALUES (?, ?, ?, ?)
  `);

  const contactsData = [
    [
      'Campus Health Clinic & Ambulance',
      '+91 98450 11222',
      'Ground Floor, Health Block (adjacent to Gate 3)',
      '24x7 Emergency Care'
    ],
    [
      'Chief Campus Security Control Room',
      '+91 98450 22333',
      'Main Gate 1 Security Operations Desk',
      '24x7 On-duty Dispatch'
    ],
    [
      'Campus Fire & Safety Rapid Response',
      '+91 98450 33444',
      'Utility Central Block, South Zone',
      '24x7 Quick Response'
    ],
    [
      'Chief Proctor & Student Welfare Warden',
      '+91 98450 44555',
      'Administrative Block, Room 102',
      '08:00 AM - 08:00 PM'
    ]
  ];

  contactsData.forEach(c => insertContact.run(...c));

  console.log('Seed completed successfully with realistic college data!');
}

// Standalone execution support
if (require.main === module) {
  const { db } = require('./db');
  seed(db);
  process.exit(0);
}

module.exports = { seed };
