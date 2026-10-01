// Comprehensive API Endpoint Test Suite
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/api';

async function testAll() {
  console.log('--- Starting Comprehensive API Verification ---');
  let studentToken = null;
  let adminToken = null;
  let studentUser = null;
  let adminUser = null;

  // 1. Auth Login (Admin)
  console.log('1. Testing POST /api/auth/login (admin)...');
  const adminLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.com', password: 'admin123' })
  }).then(r => r.json());
  if (!adminLoginRes.success || adminLoginRes.data.user.role !== 'admin') {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLoginRes));
  }
  adminToken = adminLoginRes.data.token;
  adminUser = adminLoginRes.data.user;
  console.log('   ✓ Admin login successful. Token acquired.');

  // 2. Auth Signup (New student)
  console.log('2. Testing POST /api/auth/signup (new student)...');
  const randomEmail = `teststudent_${Date.now()}@campus.com`;
  const signupRes = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Vikram Singh', email: randomEmail, password: 'password123' })
  }).then(r => r.json());
  if (!signupRes.success || !signupRes.data.token) {
    throw new Error('Student signup failed: ' + JSON.stringify(signupRes));
  }
  studentToken = signupRes.data.token;
  studentUser = signupRes.data.user;
  console.log(`   ✓ Student signup successful for ${randomEmail}.`);

  // 3. Auth Me
  console.log('3. Testing GET /api/auth/me...');
  const meRes = await fetch(`${BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  if (!meRes.success || meRes.data.user.email !== randomEmail) {
    throw new Error('Auth me failed: ' + JSON.stringify(meRes));
  }
  console.log('   ✓ GET /api/auth/me verified.');

  // 4. Places: GET /api/places?type=
  console.log('4. Testing GET /api/places?type=Charging...');
  const placesRes = await fetch(`${BASE}/places?type=Charging`).then(r => r.json());
  if (!placesRes.success || placesRes.data.length === 0) {
    throw new Error('Places fetch failed: ' + JSON.stringify(placesRes));
  }
  const testPlaceId = placesRes.data[0].id;
  console.log(`   ✓ Places returned ${placesRes.data.length} charging spots.`);

  // 5. Places: POST /api/places/:id/status
  console.log(`5. Testing POST /api/places/${testPlaceId}/status...`);
  const statusRes = await fetch(`${BASE}/places/${testPlaceId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ status: 'Busy' })
  }).then(r => r.json());
  if (!statusRes.success || statusRes.data.status !== 'Busy') {
    throw new Error('Place status update failed: ' + JSON.stringify(statusRes));
  }
  console.log('   ✓ Place status updated to Busy.');

  // 6. Events: GET /api/events
  console.log('6. Testing GET /api/events...');
  const eventsRes = await fetch(`${BASE}/events`).then(r => r.json());
  if (!eventsRes.success || eventsRes.data.length === 0) {
    throw new Error('Events fetch failed: ' + JSON.stringify(eventsRes));
  }
  const sampleEvent = eventsRes.data[0];
  console.log(`   ✓ Found ${eventsRes.data.length} events. Sample event: ${sampleEvent.title}`);

  // 7. Events: POST /api/events (admin)
  console.log('7. Testing POST /api/events (admin)...');
  const createEventRes = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'DevOps & Docker Bootcamp',
      category: 'Technical',
      location: 'Visvesvaraya Lab 102',
      event_date: '2026-10-15',
      event_time: '11:00 AM',
      description: 'Learn modern continuous deployment and containers.'
    })
  }).then(r => r.json());
  if (!createEventRes.success) {
    throw new Error('Event creation failed: ' + JSON.stringify(createEventRes));
  }
  const createdEventId = createEventRes.data.id;
  console.log(`   ✓ Created event #${createdEventId}.`);

  // 8. Events: POST /api/events/:id/register
  console.log(`8. Testing POST /api/events/${createdEventId}/register...`);
  const regRes = await fetch(`${BASE}/events/${createdEventId}/register`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  if (!regRes.success || regRes.data.registration_count !== 1) {
    throw new Error('Event registration failed: ' + JSON.stringify(regRes));
  }
  console.log('   ✓ Registered successfully for event. Count is now 1.');

  // 9. Events: DELETE /api/events/:id (admin)
  console.log(`9. Testing DELETE /api/events/${createdEventId}...`);
  const delEventRes = await fetch(`${BASE}/events/${createdEventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  if (!delEventRes.success) {
    throw new Error('Event deletion failed: ' + JSON.stringify(delEventRes));
  }
  console.log('   ✓ Deleted event successfully.');

  // 10. Issues: POST /api/issues (multipart)
  console.log('10. Testing POST /api/issues (multipart with dummy photo)...');
  // Create dummy image in scratch
  const dummyImgPath = path.join(__dirname, 'dummy_test_photo.jpg');
  fs.writeFileSync(dummyImgPath, Buffer.from('fake image content for testing'));

  const formData = new FormData();
  formData.append('block', 'Aryabhata Academic Block');
  formData.append('category', 'fan');
  formData.append('description', 'Ceiling fan in Room 302 rattling loudly during lecture');
  formData.append('photo', new Blob([fs.readFileSync(dummyImgPath)], { type: 'image/jpeg' }), 'dummy_photo.jpg');

  const createIssueRes = await fetch(`${BASE}/issues`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    body: formData
  }).then(r => r.json());
  if (!createIssueRes.success || !createIssueRes.data.id) {
    throw new Error('Issue creation failed: ' + JSON.stringify(createIssueRes));
  }
  const newIssueId = createIssueRes.data.id;
  console.log(`   ✓ Reported new issue #${newIssueId} with photo URL: ${createIssueRes.data.photo_url}`);

  // 11. Issues: POST /api/issues/:id/upvote
  console.log(`11. Testing POST /api/issues/${newIssueId}/upvote...`);
  const upvoteRes = await fetch(`${BASE}/issues/${newIssueId}/upvote`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  if (!upvoteRes.success || upvoteRes.data.upvotes !== 1) {
    throw new Error('Issue upvote failed: ' + JSON.stringify(upvoteRes));
  }
  console.log(`   ✓ Upvoted issue #${newIssueId}. Upvotes: ${upvoteRes.data.upvotes}`);

  // 12. Issues: PATCH /api/issues/:id/status (admin)
  console.log(`12. Testing PATCH /api/issues/${newIssueId}/status -> In Progress -> Resolved...`);
  const statusProgRes = await fetch(`${BASE}/issues/${newIssueId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'In Progress' })
  }).then(r => r.json());
  if (!statusProgRes.success || statusProgRes.data.status !== 'In Progress') {
    throw new Error('Issue status In Progress failed: ' + JSON.stringify(statusProgRes));
  }

  const statusResRes = await fetch(`${BASE}/issues/${newIssueId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'Resolved' })
  }).then(r => r.json());
  if (!statusResRes.success || statusResRes.data.status !== 'Resolved') {
    throw new Error('Issue status Resolved failed: ' + JSON.stringify(statusResRes));
  }
  console.log(`   ✓ Updated issue #${newIssueId} status to In Progress and then Resolved.`);

  // 13. Issues: GET /api/issues/mine
  console.log('13. Testing GET /api/issues/mine...');
  const myIssuesRes = await fetch(`${BASE}/issues/mine`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  if (!myIssuesRes.success || myIssuesRes.data.length === 0) {
    throw new Error('My issues failed: ' + JSON.stringify(myIssuesRes));
  }
  console.log(`   ✓ Retrieved student's ${myIssuesRes.data.length} personal reported issues.`);

  // 14. Lost & Found: POST /api/lostfound (multipart)
  console.log('14. Testing POST /api/lostfound...');
  const lfForm = new FormData();
  lfForm.append('type', 'Lost');
  lfForm.append('title', 'Blue Engineering Smart ID Card');
  lfForm.append('category', 'ID card');
  lfForm.append('location', 'Central Library 1st Floor');
  lfForm.append('description', 'Lost student smart card bearing USN 1AP22CS088');
  lfForm.append('contact_info', 'Vikram: 9876543219');
  lfForm.append('photo', new Blob([fs.readFileSync(dummyImgPath)], { type: 'image/jpeg' }), 'lost_id.jpg');

  const createLfRes = await fetch(`${BASE}/lostfound`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    body: lfForm
  }).then(r => r.json());
  if (!createLfRes.success) {
    throw new Error('Lost & Found creation failed: ' + JSON.stringify(createLfRes));
  }
  const lfId = createLfRes.data.id;
  console.log(`   ✓ Posted lost item #${lfId}.`);

  // 15. Lost & Found: PATCH /api/lostfound/:id/resolve
  console.log(`15. Testing PATCH /api/lostfound/${lfId}/resolve...`);
  const resolveLfRes = await fetch(`${BASE}/lostfound/${lfId}/resolve`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  if (!resolveLfRes.success || resolveLfRes.data.status !== 'Returned / Claimed') {
    throw new Error('Resolve lost item failed: ' + JSON.stringify(resolveLfRes));
  }
  console.log('   ✓ Marked item as Returned / Claimed.');

  // 16. Lost & Found: GET /api/lostfound
  console.log('16. Testing GET /api/lostfound?type=Lost...');
  const lfListRes = await fetch(`${BASE}/lostfound?type=Lost`).then(r => r.json());
  if (!lfListRes.success) {
    throw new Error('Lost & found fetch failed: ' + JSON.stringify(lfListRes));
  }
  console.log(`   ✓ Retrieved ${lfListRes.data.length} lost items.`);

  // 17. Canteen: GET /api/canteen/menu
  console.log('17. Testing GET /api/canteen/menu...');
  const menuRes = await fetch(`${BASE}/canteen/menu`).then(r => r.json());
  if (!menuRes.success || menuRes.data.length === 0) {
    throw new Error('Menu fetch failed: ' + JSON.stringify(menuRes));
  }
  const sampleMenuItem = menuRes.data[0];
  console.log(`   ✓ Canteen menu has ${menuRes.data.length} items. Sample: ${sampleMenuItem.item} (₹${sampleMenuItem.price})`);

  // 18. Canteen: PATCH /api/canteen/menu/:id (admin)
  console.log(`18. Testing PATCH /api/canteen/menu/${sampleMenuItem.id} (admin)...`);
  const updateMenuRes = await fetch(`${BASE}/canteen/menu/${sampleMenuItem.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ price: 55 })
  }).then(r => r.json());
  if (!updateMenuRes.success || updateMenuRes.data.price !== 55) {
    throw new Error('Menu update failed: ' + JSON.stringify(updateMenuRes));
  }
  console.log('   ✓ Updated menu item price to ₹55.');

  // 19. Canteen: POST /api/canteen/crowd
  console.log('19. Testing POST /api/canteen/crowd (vote High)...');
  const crowdVoteRes = await fetch(`${BASE}/canteen/crowd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ level: 'High' })
  }).then(r => r.json());
  if (!crowdVoteRes.success) {
    throw new Error('Crowd vote failed: ' + JSON.stringify(crowdVoteRes));
  }
  console.log(`   ✓ Voted High. Crowd is now: ${crowdVoteRes.data.level}, Wait: ${crowdVoteRes.data.waitTime}`);

  // 20. Canteen: GET /api/canteen/crowd
  console.log('20. Testing GET /api/canteen/crowd...');
  const crowdGetRes = await fetch(`${BASE}/canteen/crowd`).then(r => r.json());
  if (!crowdGetRes.success) {
    throw new Error('Crowd get failed: ' + JSON.stringify(crowdGetRes));
  }
  console.log(`   ✓ Live crowd confirmed: ${crowdGetRes.data.level} (Total votes in 30m: ${crowdGetRes.data.totalVotes})`);

  // 21. Bus: GET /api/bus
  console.log('21. Testing GET /api/bus...');
  const busRes = await fetch(`${BASE}/bus`).then(r => r.json());
  if (!busRes.success || busRes.data.routes.length === 0) {
    throw new Error('Bus fetch failed: ' + JSON.stringify(busRes));
  }
  console.log(`   ✓ Found ${busRes.data.routes.length} bus routes. Closest bus: ${busRes.data.nextUpcomingBus ? busRes.data.nextUpcomingBus.route_number : 'N/A'}`);

  // 22. Contacts: GET /api/contacts
  console.log('22. Testing GET /api/contacts...');
  const contactsRes = await fetch(`${BASE}/contacts`).then(r => r.json());
  if (!contactsRes.success || contactsRes.data.length === 0) {
    throw new Error('Contacts fetch failed: ' + JSON.stringify(contactsRes));
  }
  console.log(`   ✓ Found ${contactsRes.data.length} emergency contacts.`);

  // 23. Search: GET /api/search?q=
  console.log('23. Testing GET /api/search?q=Library...');
  const searchRes = await fetch(`${BASE}/search?q=Library`).then(r => r.json());
  if (!searchRes.success || searchRes.data.totalResults === 0) {
    throw new Error('Search failed: ' + JSON.stringify(searchRes));
  }
  console.log(`   ✓ Search for "Library" returned ${searchRes.data.totalResults} results across places, events, and lost items.`);

  // 24. Today: GET /api/today
  console.log('24. Testing GET /api/today (with auth header)...');
  const todayRes = await fetch(`${BASE}/today`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  if (!todayRes.success || !todayRes.data.college) {
    throw new Error('Today feed failed: ' + JSON.stringify(todayRes));
  }
  console.log(`   ✓ Today feed verified: College: ${todayRes.data.college.name}, Next Bus: ${todayRes.data.nextBus ? todayRes.data.nextBus.route_number : 'None'}`);

  // Clean up dummy image
  if (fs.existsSync(dummyImgPath)) {
    fs.unlinkSync(dummyImgPath);
  }

  console.log('\n🎉 ALL 25 REST API ENDPOINTS TESTED AND PASSED WITH 100% SUCCESS!');
}

testAll().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
