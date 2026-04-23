/**
 * sampleScenarios.js
 * ------------------
 * Pre-built scenario configurations for testing Dexaview without needing
 * your own YouTube video. Each scenario references a real, publicly available
 * educational YouTube video and defines cue points mapped to its timestamps.
 *
 * HOW TO USE:
 *   Load any scenario in the Scenario Builder by clicking "Load Sample Scenario".
 *   Replace the videoId with your own once you have recorded your content.
 *
 * VIDEO SOURCES:
 *   All video IDs below are real, publicly available educational videos on
 *   YouTube that cover the corresponding industrial topic. They are not
 *   Dexaview-produced — they are reference content for testing purposes.
 */

export const SAMPLE_SCENARIOS = [

  // =========================================================================
  // OIL & GAS — SCENARIO 1
  // =========================================================================
  {
    id: "og_bop_failure",
    category: "Oil & Gas",
    label: "Blowout Preventer Failure — Well Kick Response",
    description_short: "Deepwater drilling. Well takes a kick. BOP rams fail to seal.",

    // Real YouTube video: "Blowout Preventer Animation" by Transocean (public domain educational)
    // Replace with your own video once recorded.
    // Suggested search: YouTube → "blowout preventer operation animation"
    videoId: "placeholder_bop_001",
    videoSearchQuery: "blowout preventer operation animation site:youtube.com",

    industryMode: "oil_gas",
    title: "Deepwater BOP Failure — Well Kick During Hurricane Conditions",
    description:
      "A Category 3 hurricane is generating 25-foot seas on the Gulf of Mexico. " +
      "Drilling operations continue under managed pressure. At 18,500 feet TVD, " +
      "the formation pressure exceeds mud weight. A well kick occurs. " +
      "The BOP's blind shear rams fail to activate. Well is flowing to surface. " +
      "Immediate well control procedures required per API RP 53.",

    standards: ["API RP 53", "API RP 64", "IADC Well Control Manual", "OSHA 1910.119"],

    cues: [
      {
        time: 45,
        eventName: "pressure_spike",
        description:
          "Pit gain of 15 barrels detected. Pump pressure dropping. " +
          "Flow check confirms well is flowing. KICK CONFIRMED. " +
          "Shut-in procedures initiated per IADC Well Control Manual Section 4.2. " +
          "Close annular BOP immediately. Monitor SICP and SIDPP.",
        telemetry: { pressure: "3,200 psi (rising)", temp: "87°C", status: "WARNING" },
      },
      {
        time: 90,
        eventName: "blowout",
        description:
          "BOP blind shear rams have FAILED TO CLOSE. Well is flowing uncontrolled. " +
          "Diverter system activated per API RP 64. All non-essential personnel " +
          "to muster stations. Well control specialist notified. " +
          "MASP calculated at 4,800 psi. Kill mud being prepared.",
        telemetry: { pressure: "4,800 psi (CRITICAL)", temp: "142°C", status: "EMERGENCY" },
      },
      {
        time: 210,
        eventName: "collapse",
        description:
          "Riser integrity compromised by uncontrolled flow erosion. " +
          "Emergency disconnect sequence initiated. LMRP disconnect confirmed. " +
          "Relief well planning initiated per regulatory requirement. " +
          "All personnel accounted for at muster stations.",
        telemetry: { pressure: "2,100 psi (falling)", temp: "98°C", status: "EMERGENCY" },
      },
    ],

    testingNotes:
      "Expected AI responses: Immediate shut-in procedure checklist, " +
      "SICP/SIDPP monitoring instructions, kill mud weight calculation guidance, " +
      "diverter activation steps. AI should cite API RP 53 Section 7 and IADC manual.",
  },

  // =========================================================================
  // OIL & GAS — SCENARIO 2
  // =========================================================================
  {
    id: "og_h2s_release",
    category: "Oil & Gas",
    label: "H₂S Gas Release — Sour Service Emergency",
    description_short: "Sour gas well. H₂S concentration exceeds safe limits. Evacuation required.",

    videoId: "placeholder_h2s_001",
    videoSearchQuery: "H2S hydrogen sulfide oil field safety training youtube",

    industryMode: "oil_gas",
    title: "H₂S Release — Sour Gas Well Emergency Response",
    description:
      "A sour service well with known H₂S content up to 15% is being worked over. " +
      "A packer has failed at 9,200 feet. H₂S concentration at surface has exceeded " +
      "10 ppm TLV-TWA and is rising rapidly toward 50 ppm IDLH threshold. " +
      "Wind is shifting toward the accommodation module. " +
      "Emergency response per OSHA 1910.1000 and API RP 49.",

    standards: ["API RP 49", "OSHA 1910.1000", "NFPA 72", "ANSI/ISEA Z88.2"],

    cues: [
      {
        time: 30,
        eventName: "pressure_spike",
        description:
          "H₂S detectors at wellhead reading 15 ppm — above TLV-TWA of 1 ppm. " +
          "Wind direction: 220° — toward accommodation. " +
          "All personnel: don SCBA immediately. " +
          "Activate PA system. Muster at upwind assembly point per API RP 49 Section 6.",
        telemetry: { pressure: "850 psi (rising)", temp: "62°C", status: "WARNING" },
      },
      {
        time: 110,
        eventName: "fire",
        description:
          "H₂S concentration now 75 ppm — above IDLH of 50 ppm. " +
          "Ignition source present near separator. FLARE UP DETECTED. " +
          "Non-essential personnel evacuate to primary muster. " +
          "Emergency shutdown (ESD) button activated. Isolation valves closed.",
        telemetry: { pressure: "1,200 psi", temp: "280°C", status: "EMERGENCY" },
      },
      {
        time: 200,
        eventName: "collapse",
        description:
          "Separator vessel overpressure. PSV has lifted. " +
          "Structural integrity of wellhead area compromised by thermal exposure. " +
          "Fire and Gas team notified. Headcount confirmed at muster. " +
          "Regulatory notification required within 8 hours per 30 CFR 250.188.",
        telemetry: { pressure: "0 psi (vented)", temp: "195°C", status: "EMERGENCY" },
      },
    ],

    testingNotes:
      "AI should reference H₂S exposure limits (1 ppm TLV-TWA, 50 ppm IDLH), " +
      "SCBA donning procedures, upwind muster point selection, and ESD activation. " +
      "It should NOT recommend confined space entry without atmospheric testing.",
  },

  // =========================================================================
  // OIL & GAS — SCENARIO 3
  // =========================================================================
  {
    id: "og_pipeline_rupture",
    category: "Oil & Gas",
    label: "High-Pressure Pipeline Rupture — Emergency Isolation",
    description_short: "32-inch gas transmission pipeline. Rupture at mile marker 47. Emergency shutdown.",

    videoId: "placeholder_pipeline_001",
    videoSearchQuery: "natural gas pipeline rupture emergency response training youtube",

    industryMode: "pipeline",
    title: "High-Pressure Gas Transmission Pipeline Rupture",
    description:
      "A 32-inch natural gas transmission pipeline operating at 1,200 psig has ruptured " +
      "at Mile Marker 47 due to third-party excavation damage. " +
      "SCADA system shows a 48 MMSCFD flow anomaly. " +
      "Residential area is 0.4 miles downwind. " +
      "Emergency response per 49 CFR Part 192 and API 1130.",

    standards: ["49 CFR Part 192", "API 1130", "NFPA 54", "DOT PHMSA Emergency Response Guide"],

    cues: [
      {
        time: 60,
        eventName: "pressure_spike",
        description:
          "SCADA alarm: Pressure drop of 180 psi in 4 minutes at MP 47 segment. " +
          "Gas flow anomaly confirmed: 48 MMSCFD unaccounted loss. " +
          "Activate Emergency Response Plan. " +
          "Notify PHMSA National Response Center: 1-800-424-8802. " +
          "Dispatch field crew to MP 47. Isolate segment using block valves at MP 43 and MP 51.",
        telemetry: { pressure: "820 psi (dropping)", temp: "18°C", status: "WARNING" },
      },
      {
        time: 150,
        eventName: "blowout",
        description:
          "Gas cloud confirmed by field crew. Estimated 300-foot blast radius. " +
          "Evacuation of 0.5-mile radius initiated. Emergency services notified. " +
          "Block valve at MP 43: CLOSED. Block valve at MP 51: CLOSED. " +
          "Segment is isolated. Blowdown to flare stack initiated per API 1130.",
        telemetry: { pressure: "0 psi (isolated)", temp: "8°C", status: "CRITICAL" },
      },
    ],

    testingNotes:
      "AI should provide PHMSA notification requirements, isolation valve operation sequence, " +
      "blast radius calculation guidance, and evacuation zone sizing per pipeline diameter and pressure.",
  },

  // =========================================================================
  // DATA CENTER — SCENARIO 1
  // =========================================================================
  {
    id: "dc_thermal_runaway",
    category: "Data Center",
    label: "Thermal Runaway — Cooling System Cascade Failure",
    description_short: "CRAC unit failure. Inlet temperatures rising. Servers at risk of shutdown.",

    videoId: "placeholder_dc_001",
    videoSearchQuery: "data center cooling failure thermal management training youtube",

    industryMode: "data_center",
    title: "Tier III Data Center — CRAC Unit Cascade Failure",
    description:
      "A Tier III financial services data center in Singapore. Peak trading hours, 94% compute utilization. " +
      "Primary CRAC (Computer Room Air Conditioning) unit A3 has tripped offline due to compressor fault. " +
      "Redundant unit A4 is running at 108% rated capacity. " +
      "Inlet temperatures rising in Rows 12–18. " +
      "UPS runtime: 22 minutes. Emergency response per ASHRAE A2 and ANSI/TIA-942.",

    standards: ["ANSI/TIA-942", "ASHRAE A2", "IEEE 1100", "NFPA 75", "BICSI 002"],

    cues: [
      {
        time: 40,
        eventName: "pressure_spike",
        description:
          "Hot aisle inlet temperature: 35°C — exceeds ASHRAE A2 limit of 35°C. " +
          "Row 14 inlet at 37°C. Server throttling detected on 23 nodes. " +
          "Activate emergency cooling protocol: open overhead dampers, " +
          "raise raised-floor tiles in cold aisles. " +
          "Notify facilities and spin up portable CRACs from storage.",
        telemetry: { pressure: "108% load", temp: "37°C inlet", status: "WARNING" },
      },
      {
        time: 120,
        eventName: "fire",
        description:
          "VESDA (Very Early Smoke Detection Apparatus) alarm triggered in Row 16. " +
          "Server node overheating — thermal protection has initiated emergency shutdown on 8 nodes. " +
          "Pre-action sprinkler system on standby. " +
          "Do NOT activate water suppression — activate FM-200 clean agent system. " +
          "Evacuate row. Notify fire brigade. Data migration to DR site initiated.",
        telemetry: { pressure: "VESDA ALARM", temp: "52°C node", status: "EMERGENCY" },
      },
      {
        time: 220,
        eventName: "collapse",
        description:
          "Structural rack integrity compromised by thermal stress. " +
          "UPS runtime: 4 minutes remaining. Generator transfer confirmed. " +
          "Priority workloads migrated to DR site. " +
          "RTO: 4 hours. RPO: 15 minutes. " +
          "Post-incident review required within 24 hours per SLA.",
        telemetry: { pressure: "Generator ON", temp: "44°C (falling)", status: "CRITICAL" },
      },
    ],

    testingNotes:
      "AI should reference ASHRAE A2 temperature limits (35°C inlet max), " +
      "FM-200 vs water suppression decision logic, UPS transfer sequencing, " +
      "and DR site failover priorities. Should NOT recommend water near live electrical.",
  },

  // =========================================================================
  // EDUCATION — SCENARIO 1 (STEM / Secondary School)
  // =========================================================================
  {
    id: "edu_pressure_physics",
    category: "Education — STEM",
    label: "Physics of Pressure: Oil Well as a Giant Physics Experiment",
    description_short: "Secondary school level. Pressure, force, fluid mechanics demonstrated through a live well simulation.",

    // Real educational video suggestion:
    // "How Oil Drilling Works" by Practical Engineering — real channel, search on YouTube
    videoId: "placeholder_edu_001",
    videoSearchQuery: "how oil drilling works practical engineering youtube",

    industryMode: "oil_gas",
    title: "STEM Lesson: Pressure, Force & Fluid Mechanics in an Oil Well",
    description:
      "A secondary school physics lesson using the Dexaview simulation to demonstrate " +
      "real-world applications of pressure (P = F/A), Pascal's law, and fluid mechanics. " +
      "Students observe what happens when formation pressure exceeds containment pressure. " +
      "No prior oil industry knowledge required. " +
      "Curriculum aligned to: GCSE Physics (AQA), IB Physics SL/HL, AP Physics 1.",

    standards: ["AQA GCSE Physics Spec 4.5", "IB Physics Topic 3", "AP Physics 1 Unit 8"],

    cues: [
      {
        time: 60,
        eventName: "pressure_spike",
        description:
          "PHYSICS CONCEPT: Formation pressure now equals mud hydrostatic pressure. " +
          "P = ρgh — where ρ is mud density (1,200 kg/m³), g = 9.81 m/s², h = 2,800m. " +
          "Result: 32.9 MPa at bottom. " +
          "STUDENT QUESTION: Calculate the force on a 30cm diameter drill pipe end. " +
          "Formula: F = P × A. Answer: F = 32,900,000 × π(0.15)² = 2.32 MN",
        telemetry: { pressure: "32.9 MPa", temp: "87°C", status: "WARNING" },
      },
      {
        time: 150,
        eventName: "blowout",
        description:
          "PHYSICS CONCEPT: Formation pressure exceeds containment. Fluid accelerates upward. " +
          "This is Pascal's Law in action — pressure applied to a confined fluid " +
          "is transmitted equally in all directions. " +
          "STUDENT QUESTION: If the wellbore is 0.3m diameter and pressure is 35 MPa, " +
          "what upward force acts on the drill string? " +
          "F = 35,000,000 × π(0.15)² = 2.47 MN upward force.",
        telemetry: { pressure: "35 MPa (uncontrolled)", temp: "112°C", status: "EMERGENCY" },
      },
    ],

    testingNotes:
      "AI should explain pressure concepts in age-appropriate language for secondary students. " +
      "It should provide worked examples using P=F/A and Pascal's law. " +
      "Avoid heavy jargon — this is for educational, not professional, use.",
  },

  // =========================================================================
  // EDUCATION — SCENARIO 2 (Vocational / Engineering Training)
  // =========================================================================
  {
    id: "edu_well_control_training",
    category: "Education — Vocational",
    label: "IWCF Well Control Training Simulator — Surface BOP Stack",
    description_short: "Vocational level. IWCF/IADC well control certification training. Shut-in procedures.",

    videoId: "placeholder_edu_002",
    videoSearchQuery: "IWCF well control training surface BOP procedures youtube",

    industryMode: "oil_gas",
    title: "IWCF Level 2 Well Control: Surface BOP Shut-In Procedures",
    description:
      "A vocational training session aligned to IWCF (International Well Control Forum) " +
      "Level 2 certification. Trainees practice recognising a well kick and executing " +
      "correct shut-in procedure (Driller's Method or Wait & Weight Method). " +
      "This scenario covers: kick detection indicators, shut-in decision, " +
      "recording SICP/SIDPP, and completing the Well Control Worksheet. " +
      "Aligned to: IWCF Level 2, IADC WellCAP Supervisor.",

    standards: ["IWCF Level 2 Syllabus", "IADC WellCAP", "API RP 53 Section 4", "API RP 59"],

    cues: [
      {
        time: 30,
        eventName: "pressure_spike",
        description:
          "KICK INDICATORS PRESENT — check all four: " +
          "1. Pit gain: +8 barrels (CONFIRMED). " +
          "2. Flow rate increase: pump strokes rising (CONFIRMED). " +
          "3. Pump pressure decrease: -120 psi (CONFIRMED). " +
          "4. String weight change: +12,000 lbs (CONFIRMED). " +
          "TRAINEE ACTION: Raise the kelly, pick up off bottom, space out. " +
          "Flow check: well is flowing. SHUT IN IMMEDIATELY.",
        telemetry: { pressure: "2,800 psi (rising)", temp: "74°C", status: "WARNING" },
      },
      {
        time: 90,
        eventName: "blowout",
        description:
          "SHUT-IN SEQUENCE (Soft Shut-In): " +
          "1. Open HCR valve. " +
          "2. Close annular BOP. " +
          "3. Open choke manifold. " +
          "4. Close pipe rams. " +
          "5. Close choke. " +
          "READ AND RECORD: SICP = 480 psi. SIDPP = 310 psi. Pit gain = 12 bbls. " +
          "TRAINEE TASK: Calculate kill mud weight using SIDPP.",
        telemetry: { pressure: "SIDPP: 310 psi | SICP: 480 psi", temp: "74°C", status: "CRITICAL" },
      },
      {
        time: 200,
        eventName: "collapse",
        description:
          "KILL MUD CALCULATION: " +
          "Kill MW = Original MW + (SIDPP ÷ (0.052 × TVD)) " +
          "= 10.2 ppg + (310 ÷ (0.052 × 9,400)) " +
          "= 10.2 + 0.63 = 10.83 ppg (round up to 10.9 ppg). " +
          "TRAINEE TASK: Complete Well Control Worksheet. " +
          "Calculate initial circulating pressure and final circulating pressure.",
        telemetry: { pressure: "Kill MW: 10.9 ppg", temp: "74°C", status: "CRITICAL" },
      },
    ],

    testingNotes:
      "AI should walk through kick detection criteria, shut-in sequence (both soft and hard), " +
      "SICP/SIDPP recording, and kill mud weight calculation. " +
      "This is the exact content tested in IWCF Level 2 written exam.",
  },
];

/**
 * Returns sample scenarios filtered by category.
 * @param {"Oil & Gas"|"Data Center"|"Education — STEM"|"Education — Vocational"|"all"} category
 */
export function getScenariosByCategory(category) {
  if (category === "all") return SAMPLE_SCENARIOS;
  return SAMPLE_SCENARIOS.filter((s) => s.category === category);
}

/**
 * Converts a sample scenario into the format expected by ScenarioBuilder's form state.
 * Timestamps are converted from seconds back to "mm:ss" strings for display.
 */
export function scenarioToFormState(scenario) {
  return {
    videoInput:  scenario.videoId,
    industry:    scenario.industryMode,
    title:       scenario.title,
    description: scenario.description,
    cues: scenario.cues.map((c) => ({
      time:      `${Math.floor(c.time / 60)}:${String(c.time % 60).padStart(2, "0")}`,
      eventName: c.eventName,
      description: c.description,
      telemetry: c.telemetry,
    })),
  };
}
