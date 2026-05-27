// Vinyl Estimator — shelf packing + cost engine.
//
// Algorithm: Next Fit Decreasing Height (NFDH).
//   1. Expand items into rectangles (one per qty), add bleed all around.
//   2. Sort by height descending.
//   3. Greedily pack across shelves (rows) inside roll usable width.
//      Try rotated orientation if it fits and reduces shelf height.
//   4. Compute roll length consumed (incl. leading/trailing edges + cut pull-off).
//   5. Derive: vinyl cost, laminate cost, ink cost, machine time, blade wear, labor.

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

const sqInToSqFt = (sqIn) => sqIn / 144;

const computeRollSqFtCost = (vinyl) => {
  if (!vinyl) return 0;
  const widthFt = num(vinyl.roll_width_inches) / 12;
  const lenFt = num(vinyl.roll_length_yards) * 3;
  const rollSqFt = widthFt * lenFt;

  if (vinyl.pricing_mode === "per_sqft")        return num(vinyl.cost_per_sqft);
  if (vinyl.pricing_mode === "per_linear_foot") return num(vinyl.cost_per_linear_foot) / Math.max(widthFt, 0.01);
  return rollSqFt > 0 ? num(vinyl.cost_per_roll) / rollSqFt : 0; // per_roll
};

/**
 * @param {object} args
 * @param {Array}  args.items                 — [{ width_inches, height_inches, quantity, bleed_inches, allow_rotation }]
 * @param {object} args.printer | args.cutter | args.laminator
 * @param {object} args.vinyl | args.laminate
 * @param {number} args.operatorHourlyRate
 * @param {boolean} args.applyPrint | args.applyCut | args.applyLaminate
 * @param {number} args.overrideGutterH | args.overrideGutterV
 */
export function calculateVinylProject({
  items = [],
  printer = null, cutter = null, laminator = null,
  vinyl = null, laminate = null,
  operatorHourlyRate = 45,
  applyPrint = true, applyCut = true, applyLaminate = false,
  overrideGutterH, overrideGutterV,
} = {}) {

  // --- Roll geometry — driven by the leading machine (printer > cutter > laminator).
  const leadingMachine = (applyPrint && printer) || (applyCut && cutter) || (applyLaminate && laminator) || printer || cutter || laminator;

  const rollWidth = num(vinyl?.roll_width_inches, 54);
  const leftMargin   = num(leadingMachine?.left_margin_inches, 0.5);
  const rightMargin  = num(leadingMachine?.right_margin_inches, 0.5);
  const leadingEdge  = num(leadingMachine?.leading_edge_inches, 4);
  const trailingEdge = num(leadingMachine?.trailing_edge_inches, 2);

  // Machine cap (e.g. printer max 64") vs roll (e.g. 54") — usable width is the smaller.
  const machineWidthCap = Math.min(
    applyPrint && printer ? num(printer.max_media_width_inches, 999) : 999,
    applyCut && cutter ? num(cutter.max_media_width_inches, 999) : 999,
    applyLaminate && laminator ? num(laminator.max_media_width_inches, 999) : 999,
  );
  const effectiveRollWidth = Math.min(rollWidth, machineWidthCap);
  const usableWidth = Math.max(0, effectiveRollWidth - leftMargin - rightMargin);

  const gutterH = overrideGutterH ?? num(leadingMachine?.default_gutter_horizontal_inches, 0.25);
  const gutterV = overrideGutterV ?? num(leadingMachine?.default_gutter_vertical_inches, 0.25);

  // --- Expand items into rectangles. Bleed = empty waste halo around the part:
  //     packed rect (outer) = part size + 2*bleed (reserves space on the roll for safe trimming)
  //     part rect (inner)   = the actual printed/cut artwork (unchanged size)
  const rects = [];
  items.forEach((it, itemIdx) => {
    const baseBleed = num(it.bleed_inches, num(leadingMachine?.default_bleed_inches, 0));
    const partW = num(it.width_inches);
    const partH = num(it.height_inches);
    const w0 = partW + baseBleed * 2;
    const h0 = partH + baseBleed * 2;
    const qty = Math.max(1, Math.floor(num(it.quantity, 1)));
    if (partW <= 0 || partH <= 0) return;

    for (let i = 0; i < qty; i++) {
      rects.push({
        id: `${it.id || itemIdx}-${i}`,
        itemId: it.id || `idx-${itemIdx}`,
        itemIdx,
        description: it.description || `Item ${itemIdx + 1}`,
        w: w0, h: h0,            // OUTER bounding rect (with bleed halo)
        partW, partH,            // INNER part size (no bleed)
        bleed: baseBleed,        // halo thickness (each side)
        allow_rotation: it.allow_rotation !== false,
        rotated: false,
      });
    }
  });

  // --- Sort tallest first for NFDH.
  rects.sort((a, b) => b.h - a.h);

  // --- Pack onto shelves
  const shelves = []; // { y, height, items: [{x,y,w,h, ...rect}] }
  let yCursor = 0;
  let currentShelf = null;

  const placeOnNewShelf = (r) => {
    // Only rotate if the user explicitly allowed it AND it's needed to fit width-wise.
    let w = r.w, h = r.h, rotated = false;
    let pw = r.partW, ph = r.partH;
    if (w > usableWidth) {
      if (r.allow_rotation && h <= usableWidth) {
        [w, h] = [h, w];
        [pw, ph] = [ph, pw];
        rotated = true;
      } else {
        return false; // doesn't fit and can't (or isn't allowed to) rotate
      }
    }

    currentShelf = { y: yCursor, height: h, items: [] };
    shelves.push(currentShelf);
    currentShelf.items.push({ ...r, x: 0, y: yCursor, w, h, partW: pw, partH: ph, rotated });
    yCursor += h + gutterV;
    return true;
  };

  for (const r of rects) {
    if (!currentShelf) {
      if (!placeOnNewShelf(r)) continue;
      continue;
    }

    // Try fit in current shelf (no rotation first, then rotated if allowed)
    const lastItem = currentShelf.items[currentShelf.items.length - 1];
    const nextX = lastItem ? lastItem.x + lastItem.w + gutterH : 0;

    let placed = false;
    // Orientation A: native
    if (r.w <= usableWidth - nextX && r.h <= currentShelf.height) {
      currentShelf.items.push({ ...r, x: nextX, y: currentShelf.y, w: r.w, h: r.h, partW: r.partW, partH: r.partH, rotated: false });
      placed = true;
    }
    // Orientation B: rotated
    if (!placed && r.allow_rotation) {
      const rw = r.h, rh = r.w;
      if (rw <= usableWidth - nextX && rh <= currentShelf.height) {
        currentShelf.items.push({ ...r, x: nextX, y: currentShelf.y, w: rw, h: rh, partW: r.partH, partH: r.partW, rotated: true });
        placed = true;
      }
    }

    if (!placed) {
      // Couldn't fit on current shelf → open a new one
      placeOnNewShelf(r);
    }
  }

  // --- Layout metrics
  const contentLengthIn = shelves.length === 0
    ? 0
    : (shelves[shelves.length - 1].y + shelves[shelves.length - 1].height);
  const totalLengthIn = contentLengthIn;

  const cutPullOff = applyCut && cutter ? num(cutter.cut_pull_off_inches_per_job, 0) : 0;
  const lengthConsumedIn = leadingEdge + contentLengthIn + trailingEdge + cutPullOff;
  const lengthConsumedFt = lengthConsumedIn / 12;

  // Used (printed/cut) area = sum of placed item INNER part rects (bleed is empty waste halo)
  const usedSqIn = shelves.reduce((s, sh) => s + sh.items.reduce((ss, it) => {
    const pw = it.partW ?? it.w;
    const ph = it.partH ?? it.h;
    return ss + pw * ph;
  }, 0), 0);
  const usedSqFt = sqInToSqFt(usedSqIn);

  const totalRollSqFtPulled = sqInToSqFt(lengthConsumedIn * effectiveRollWidth);
  const wastedSqFt = Math.max(0, totalRollSqFtPulled - usedSqFt);

  const partsPlaced = shelves.reduce((s, sh) => s + sh.items.length, 0);
  const partsRequested = rects.length;
  const partsUnplaced = partsRequested - partsPlaced;

  // --- Vinyl cost — pulled length + waste factor
  const vinylSqFtRate = computeRollSqFtCost(vinyl);
  const vinylWasteMult = 1 + num(vinyl?.waste_factor_percent, 0) / 100;
  const vinylCost = totalRollSqFtPulled * vinylSqFtRate * vinylWasteMult;

  // --- Laminate (full roll-width × length consumed, separate roll)
  let laminateSqFt = 0, laminateCost = 0, laminateMinutes = 0;
  if (applyLaminate && laminate) {
    const lamWidth = Math.min(num(laminate.roll_width_inches, effectiveRollWidth), effectiveRollWidth);
    const lamLengthIn = lengthConsumedIn + num(laminator?.leading_edge_inches, 0) + num(laminator?.trailing_edge_inches, 0);
    laminateSqFt = sqInToSqFt(lamLengthIn * lamWidth);
    const lamSqFtRate = computeRollSqFtCost(laminate);
    const lamWasteMult = 1 + num(laminate.waste_factor_percent, 0) / 100;
    laminateCost = laminateSqFt * lamSqFtRate * lamWasteMult;

    const ipm = Math.max(1, num(laminator?.laminator_speed_inches_per_minute, 100));
    laminateMinutes = (lamLengthIn / ipm) + num(laminator?.laminator_setup_minutes_per_job, 0);
  }

  // --- Print (HP Latex 360 etc.)
  let inkCost = 0, printMinutes = 0, printMachineCost = 0;
  if (applyPrint && printer) {
    inkCost = (usedSqFt * 144) * num(printer.print_cost_per_sqin, 0);
    const sph = Math.max(1, num(printer.print_speed_sqft_per_hour, 100));
    printMinutes =
      (usedSqFt / sph) * 60 +
      num(printer.warmup_minutes, 0) +
      num(printer.media_load_minutes, 0) +
      num(printer.calibration_minutes_per_job, 0);
    printMachineCost = (printMinutes / 60) * num(printer.machine_hourly_rate, 0);
  }

  // --- Cut (Graphtec etc.) — perimeter of each placed part (INNER size, not bleed halo)
  let cutDistanceIn = 0, cutMinutes = 0, cutMachineCost = 0, bladeCost = 0;
  if (applyCut && cutter) {
    cutDistanceIn = shelves.reduce((s, sh) => s + sh.items.reduce((ss, it) => {
      const pw = it.partW ?? it.w;
      const ph = it.partH ?? it.h;
      return ss + 2 * (pw + ph);
    }, 0), 0);
    const ips = Math.max(0.1, num(cutter.cut_speed_inches_per_second, 30));
    cutMinutes = (cutDistanceIn / ips) / 60 + num(cutter.cut_setup_minutes_per_job, 0);
    cutMachineCost = (cutMinutes / 60) * num(cutter.machine_hourly_rate, 0);
    const bladeLife = Math.max(1, num(cutter.cut_blade_life_minutes, 6000));
    bladeCost = (cutMinutes / bladeLife) * num(cutter.cut_blade_cost, 0);
  }

  // --- Laminator machine cost
  const laminateMachineCost = applyLaminate && laminator
    ? (laminateMinutes / 60) * num(laminator.laminator_hourly_rate, 0)
    : 0;

  const machineCost = printMachineCost + cutMachineCost + laminateMachineCost;

  // --- Labor — operator runs each machine
  const laborMinutes = (applyPrint ? printMinutes : 0) + (applyCut ? cutMinutes : 0) + (applyLaminate ? laminateMinutes : 0);
  const laborHours = laborMinutes / 60;
  const laborCost = laborHours * num(operatorHourlyRate, 45);

  const materialCost = vinylCost + laminateCost + inkCost + bladeCost;
  const totalCost = materialCost + machineCost + laborCost;

  return {
    // geometry
    usableWidth, effectiveRollWidth, leadingEdge, trailingEdge, gutterH, gutterV,
    shelves, partsPlaced, partsRequested, partsUnplaced,
    totalLengthIn, lengthConsumedIn, lengthConsumedFt,
    usedSqFt, totalRollSqFtPulled, wastedSqFt,
    // cost breakdown
    vinylCost, laminateCost, laminateSqFt,
    inkCost, printMinutes, printMachineCost,
    cutDistanceIn, cutMinutes, cutMachineCost, bladeCost,
    laminateMinutes, laminateMachineCost,
    machineCost, laborMinutes, laborHours, laborCost,
    materialCost, totalCost,
  };
}