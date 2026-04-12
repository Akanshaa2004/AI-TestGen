import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import nlp from 'compromise';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI is not defined. Skipping database connection — using in-memory mode.');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

connectDB();

// --- Models ---
const testCaseSchema = new mongoose.Schema({
  tcId: String,
  title: String,
  description: String,
  preconditions: [String],
  steps: [String],
  expectedResult: String,
  typeBadge: { type: String, default: 'POSITIVE' },
  urgency: { type: String, default: 'HIGH' },
  category: { type: String, default: 'Functional' },
  createdAt: { type: Date, default: Date.now }
});

const TestCase = mongoose.model('TestCase', testCaseSchema);

const generationEventSchema = new mongoose.Schema({
  inputRequirements: String,
  testType: { type: String, default: 'Functional' },
  generatedTestCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' }],
  createdAt: { type: Date, default: Date.now }
});

const GenerationEvent = mongoose.model('GenerationEvent', generationEventSchema);


// --- NLP-based Test Case Generator (supports all 10 strategies) ---
function generateTestCases(text, testType = 'Functional') {
  const doc = nlp(text);
  const nouns = doc.nouns().out('array');
  const verbs = doc.verbs().out('array');
  const subject = nouns.length > 0 ? nouns[0] : 'Feature';
  const action = verbs.length > 0 ? verbs[0] : 'process';

  const words = text.split(/\s+/).length;
  const multiplier = Math.max(1, Math.floor(words / 20));

  let count = 1;
  const id = () => `TC-${String(count++).padStart(3, '0')}`;

  // ──────────────────────────────────────────
  // Strategy-specific test templates
  // ──────────────────────────────────────────
  const templates = {
    Functional: [
      { title: `Valid ${subject} Flow`, desc: `Verify standard valid operation of ${subject}`, steps: [`Navigate to the ${subject} interface`, `Enter valid registered details`, `Submit request`], expected: `System processes the valid input successfully and proceeds.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `Invalid ${subject} Input`, desc: `Verify system handles invalid input for ${subject}`, steps: [`Enter improperly formatted data for ${subject}`, `Submit the form`, `Check error message`], expected: `System shows "Invalid format" error and halts.`, badge: 'NEGATIVE', urgency: 'MED' },
      { title: `Expired ${subject} State`, desc: `Verify behavior when ${subject} context expires`, steps: [`Wait for session timeout`, `Attempt to proceed with ${subject}`], expected: `System rejects operation and offers Resend/Refresh.`, badge: 'EDGE', urgency: 'LOW' },
      { title: `${subject} Boundary Values`, desc: `Verify boundary conditions for ${subject}`, steps: [`Enter minimum length input for ${subject}`, `Enter maximum length input for ${subject}`, `Verify system behavior at boundaries`], expected: `System accepts at boundaries and rejects beyond limits.`, badge: 'EDGE', urgency: 'MED' },
      { title: `Concurrent ${subject} Access`, desc: `Verify ${subject} behavior under concurrent usage`, steps: [`Open ${subject} in two browser sessions`, `Perform conflicting operations simultaneously`, `Check data consistency`], expected: `System handles concurrent access without data corruption.`, badge: 'NEGATIVE', urgency: 'HIGH' },
    ],
    Security: [
      { title: `SQL Injection on ${subject}`, desc: `Test SQL injection resistance on ${subject} inputs`, steps: [`Navigate to ${subject} input field`, `Enter SQL payload: ' OR 1=1 --`, `Submit and observe response`], expected: `System sanitizes input and returns error, no data leakage.`, badge: 'NEGATIVE', urgency: 'HIGH' },
      { title: `XSS Attack on ${subject}`, desc: `Test cross-site scripting defense`, steps: [`Enter <script>alert('XSS')</script> in ${subject} field`, `Submit form`, `Verify output encoding`], expected: `Script tags are escaped/stripped, no JS execution.`, badge: 'NEGATIVE', urgency: 'HIGH' },
      { title: `Auth Bypass on ${subject}`, desc: `Attempt unauthorized access to ${subject}`, steps: [`Clear session cookies`, `Try direct URL access to ${subject} protected resource`, `Check redirect behavior`], expected: `System redirects to login page, access denied.`, badge: 'NEGATIVE', urgency: 'HIGH' },
      { title: `CSRF Protection for ${subject}`, desc: `Verify CSRF token validation on ${subject} forms`, steps: [`Capture a valid ${subject} form request`, `Modify/remove the CSRF token`, `Replay the modified request`], expected: `Server rejects the forged request with 403 status.`, badge: 'NEGATIVE', urgency: 'MED' },
      { title: `Brute Force on ${subject} Login`, desc: `Test rate limiting on ${subject} authentication`, steps: [`Attempt 10 rapid login failures for ${subject}`, `Check if account gets locked`, `Verify lockout duration`], expected: `Account locks after 5 failed attempts, 15-minute cooldown.`, badge: 'EDGE', urgency: 'HIGH' },
    ],
    'UI / UX': [
      { title: `${subject} Responsive Layout`, desc: `Verify ${subject} renders correctly on all viewports`, steps: [`Open ${subject} on desktop (1920px)`, `Resize to tablet (768px)`, `Resize to mobile (375px)`], expected: `Layout adapts fluidly, no overflow or broken elements.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Keyboard Navigation`, desc: `Verify ${subject} is fully keyboard-accessible`, steps: [`Tab through all ${subject} interactive elements`, `Use Enter/Space to activate controls`, `Check focus ring visibility`], expected: `All elements reachable via keyboard with visible focus indicators.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Color Contrast`, desc: `Verify WCAG AA contrast ratios on ${subject}`, steps: [`Inspect all text elements on ${subject}`, `Measure foreground/background contrast ratios`, `Flag any below 4.5:1`], expected: `All text meets WCAG AA contrast requirements.`, badge: 'POSITIVE', urgency: 'LOW' },
      { title: `${subject} Loading State`, desc: `Verify proper loading feedback on ${subject}`, steps: [`Trigger data fetch on ${subject}`, `Observe loading indicator`, `Verify smooth transition to loaded state`], expected: `Spinner/skeleton appears immediately, smooth content reveal.`, badge: 'EDGE', urgency: 'LOW' },
      { title: `${subject} Error State UI`, desc: `Verify error messaging UX on ${subject}`, steps: [`Trigger an error on ${subject}`, `Check error message clarity`, `Verify "retry" or "back" actions exist`], expected: `Clear error message with actionable recovery options.`, badge: 'NEGATIVE', urgency: 'MED' },
    ],
    Performance: [
      { title: `${subject} Load Time`, desc: `Verify ${subject} page load under 3 seconds`, steps: [`Clear cache, open ${subject} page`, `Measure Time to First Byte (TTFB)`, `Measure Largest Contentful Paint (LCP)`], expected: `TTFB < 600ms, LCP < 2.5s on standard connection.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} Under 100 Concurrent Users`, desc: `Stress test ${subject} with simulated load`, steps: [`Configure load test with 100 virtual users`, `Run sustained load for 5 minutes`, `Monitor error rate and response times`], expected: `Error rate < 1%, p95 response < 2s.`, badge: 'EDGE', urgency: 'HIGH' },
      { title: `${subject} Memory Leak Detection`, desc: `Check for memory leaks in ${subject}`, steps: [`Load ${subject} and interact for 10 minutes`, `Monitor browser Memory tab`, `Check heap size growth pattern`], expected: `No sustained memory growth. GC reclaims properly.`, badge: 'NEGATIVE', urgency: 'MED' },
      { title: `${subject} API Latency`, desc: `Verify API response time for ${subject} operations`, steps: [`Trigger primary API call on ${subject}`, `Measure round-trip time`, `Repeat 50 times and compute avg`], expected: `Average response < 500ms, p99 < 1.5s.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Large Payload Handling`, desc: `Test ${subject} with large data volumes`, steps: [`Submit 10,000 character input to ${subject}`, `Verify processing completes`, `Check output correctness`], expected: `System handles large input without timeout or truncation.`, badge: 'EDGE', urgency: 'LOW' },
    ],
    API: [
      { title: `${subject} GET Endpoint`, desc: `Verify GET endpoint for ${subject} returns correct data`, steps: [`Send GET request to /api/${subject.toLowerCase()}`, `Verify 200 status code`, `Validate response schema`], expected: `Returns valid JSON with expected fields.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} POST Validation`, desc: `Test POST endpoint field validation`, steps: [`Send POST with missing required fields to /api/${subject.toLowerCase()}`, `Check error response`, `Verify error messages are descriptive`], expected: `Returns 400 with field-level error details.`, badge: 'NEGATIVE', urgency: 'HIGH' },
      { title: `${subject} Rate Limiting`, desc: `Verify API rate limiting on ${subject} endpoints`, steps: [`Send 100 requests in 10 seconds`, `Monitor response codes`, `Check for 429 Too Many Requests`], expected: `Rate limit kicks in at configured threshold.`, badge: 'EDGE', urgency: 'MED' },
      { title: `${subject} Pagination`, desc: `Test pagination on ${subject} list endpoint`, steps: [`Request page 1 with limit=10`, `Request page 2`, `Verify no duplicates across pages`], expected: `Proper pagination with accurate offset and no data overlap.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Auth Header`, desc: `Test unauthorized access to ${subject} API`, steps: [`Send request without Authorization header`, `Send request with invalid token`, `Send request with expired token`], expected: `All return 401 Unauthorized with clear error message.`, badge: 'NEGATIVE', urgency: 'HIGH' },
    ],
    Regression: [
      { title: `${subject} Core Flow After Update`, desc: `Verify ${subject} primary flow still works after code change`, steps: [`Execute the happy-path flow for ${subject}`, `Compare output with baseline`, `Flag any deviations`], expected: `Output matches baseline exactly. No regressions.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} Backward Compatibility`, desc: `Verify old ${subject} data works with new code`, steps: [`Load legacy ${subject} data from v1`, `Process through current system`, `Validate output format`], expected: `Legacy data processed correctly without errors.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Side Effect Analysis`, desc: `Check if ${subject} changes affect related modules`, steps: [`Identify modules dependent on ${subject}`, `Run integration tests for each`, `Compare with pre-change results`], expected: `No unintended changes in dependent modules.`, badge: 'EDGE', urgency: 'HIGH' },
      { title: `${subject} Rollback Safety`, desc: `Verify ${subject} can be safely rolled back`, steps: [`Deploy latest ${subject} changes`, `Trigger rollback to previous version`, `Verify system stability post-rollback`], expected: `System returns to previous state without data loss.`, badge: 'EDGE', urgency: 'MED' },
    ],
    Integration: [
      { title: `${subject} → Database Integration`, desc: `Verify ${subject} data persists correctly`, steps: [`Submit valid data via ${subject}`, `Query database directly`, `Compare submitted vs stored data`], expected: `Database contains exact data submitted. No transformation errors.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} → Email Service`, desc: `Verify ${subject} triggers email notifications`, steps: [`Complete ${subject} action that triggers email`, `Check email service logs`, `Verify email content and recipient`], expected: `Email sent within 30s with correct template and data.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} → Third-Party API`, desc: `Verify ${subject} communicates with external services`, steps: [`Trigger ${subject} action that calls external API`, `Monitor outbound request`, `Validate response handling`], expected: `External API called correctly, response parsed and stored.`, badge: 'EDGE', urgency: 'MED' },
      { title: `${subject} Data Flow Integrity`, desc: `Verify end-to-end data integrity through ${subject}`, steps: [`Submit data through ${subject} UI`, `Trace through API → service → database`, `Verify data at each layer`], expected: `Data is consistent at every layer with no silent mutations.`, badge: 'POSITIVE', urgency: 'HIGH' },
    ],
    Accessibility: [
      { title: `${subject} Screen Reader`, desc: `Verify ${subject} works with screen readers`, steps: [`Enable NVDA/VoiceOver`, `Navigate through ${subject} page`, `Verify all content is announced correctly`], expected: `All content, labels, and states are properly announced.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} ARIA Labels`, desc: `Verify proper ARIA attributes on ${subject}`, steps: [`Inspect DOM for ${subject} interactive elements`, `Check for aria-label, aria-describedby`, `Validate roles and states`], expected: `All interactive elements have appropriate ARIA attributes.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Focus Management`, desc: `Verify focus behavior on ${subject} modals/dialogs`, steps: [`Open a modal on ${subject}`, `Verify focus moves to modal`, `Verify focus trapping within modal`, `Check focus returns after close`], expected: `Focus is properly trapped and restored.`, badge: 'EDGE', urgency: 'MED' },
      { title: `${subject} Reduced Motion`, desc: `Test ${subject} with prefers-reduced-motion`, steps: [`Enable reduced motion in OS settings`, `Navigate through ${subject}`, `Verify animations are disabled or simplified`], expected: `No jarring animations. All transitions are subtle or removed.`, badge: 'POSITIVE', urgency: 'LOW' },
    ],
    Database: [
      { title: `${subject} CRUD Operations`, desc: `Verify Create/Read/Update/Delete for ${subject}`, steps: [`Create a new ${subject} record`, `Read and verify fields`, `Update a field and verify`, `Delete and verify removal`], expected: `All CRUD operations succeed with correct data.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} Data Integrity`, desc: `Verify referential integrity for ${subject}`, steps: [`Create a ${subject} with foreign key references`, `Attempt to delete referenced parent`, `Check cascade/restrict behavior`], expected: `Referential integrity maintained. Orphans prevented.`, badge: 'NEGATIVE', urgency: 'HIGH' },
      { title: `${subject} Index Performance`, desc: `Verify query performance with indexes on ${subject}`, steps: [`Run a query on indexed ${subject} column`, `Run same query without index`, `Compare execution times`], expected: `Indexed query runs at least 5x faster.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} Migration Safety`, desc: `Verify ${subject} schema migration works correctly`, steps: [`Apply pending migration for ${subject}`, `Verify schema changes applied`, `Run existing queries against new schema`], expected: `Migration applies cleanly, no data loss or query breaks.`, badge: 'EDGE', urgency: 'HIGH' },
    ],
    CrossBrowser: [
      { title: `${subject} on Chrome`, desc: `Verify ${subject} renders and functions on Chrome`, steps: [`Open ${subject} in latest Chrome`, `Test all interactive elements`, `Check console for errors`], expected: `All features work, no JS errors, layout intact.`, badge: 'POSITIVE', urgency: 'HIGH' },
      { title: `${subject} on Firefox`, desc: `Verify ${subject} on Firefox`, steps: [`Open ${subject} in latest Firefox`, `Test forms, navigation, and modals`, `Compare layout with Chrome baseline`], expected: `Pixel-perfect match with Chrome, all features functional.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} on Safari`, desc: `Verify ${subject} on Safari/WebKit`, steps: [`Open ${subject} in Safari`, `Test date pickers, CSS grid, and animations`, `Check for WebKit-specific issues`], expected: `All features work. CSS grid and flexbox render correctly.`, badge: 'POSITIVE', urgency: 'MED' },
      { title: `${subject} on Mobile Browsers`, desc: `Verify ${subject} on mobile Chrome and Safari`, steps: [`Open ${subject} on iOS Safari`, `Open ${subject} on Android Chrome`, `Test touch interactions and viewport`], expected: `Touch gestures work, viewport scales correctly, no overflow.`, badge: 'EDGE', urgency: 'HIGH' },
    ]
  };

  const base = templates[testType] || templates.Functional;
  const cases = base.map(t => ({
    tcId: id(),
    title: t.title,
    description: t.desc,
    preconditions: ['System is in a stable state', `${subject} module is deployed and accessible`],
    steps: t.steps,
    expectedResult: t.expected,
    typeBadge: t.badge,
    urgency: t.urgency,
    category: testType
  }));

  // Add dynamic boundary cases based on input length
  for (let i = 0; i < multiplier && i < 3; i++) {
    cases.push({
      tcId: id(),
      title: `Boundary Test ${i + 1} for ${subject}`,
      description: `Extended boundary condition test ${i + 1} on ${subject}`,
      preconditions: ['System is in a stable state'],
      steps: [`Provide edge-case input variant #${i + 1} for ${subject}`, 'Submit and observe', 'Check logs for warnings'],
      expectedResult: 'System safely handles boundary without crashes.',
      typeBadge: i % 2 === 0 ? 'EDGE' : 'NEGATIVE',
      urgency: 'MED',
      category: testType
    });
  }

  return cases;
}


// --- Routes ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@testgen.ai' && password === 'admin123') {
    return res.json({ success: true, user: { name: 'Admin User', email, role: 'Administrator', initials: 'AU' } });
  }
  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { requirements, testType } = req.body;

    if (!requirements) {
      return res.status(400).json({ error: 'Requirements text is required' });
    }

    // Simulate realistic AI pipeline latency
    await sleep(4500);

    const testCasesData = generateTestCases(requirements, testType);

    let savedTestCases = [];
    let savedEvent = null;

    // Save if DB is connected
    if (mongoose.connection.readyState === 1) {
      savedTestCases = await TestCase.insertMany(testCasesData);
      const testCaseIds = savedTestCases.map(tc => tc._id);

      const newEvent = new GenerationEvent({
        inputRequirements: requirements,
        testType: testType,
        generatedTestCases: testCaseIds
      });
      savedEvent = await newEvent.save();
    }

    res.status(200).json({
      message: 'Test cases generated successfully',
      testCases: savedTestCases.length > 0 ? savedTestCases : testCasesData,
      event: savedEvent
    });

  } catch (error) {
    console.error('Error generating test cases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/test-cases', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected.' });
    }
    const testCases = await TestCase.find().sort({ createdAt: -1 });
    res.status(200).json(testCases);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching test cases' });
  }
});

app.get('/api/generate-history', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected.' });
    }
    const events = await GenerationEvent.find().populate('generatedTestCases').sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching history' });
  }
});

app.delete('/api/generate-history/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected.' });
    }
    await GenerationEvent.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting history entry' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.listen(PORT, () => {
  console.log(`🚀 AI TestGen Server running on port ${PORT}`);
});
