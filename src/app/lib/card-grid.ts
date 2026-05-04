export interface CardGridPlan {
  cols: 2 | 3 | 4;
  mobileColsClass: string;
  tabletColsClass: string;
  desktopColsClass: string;
  itemStartClass: string[];
}

function pickCols(count: number): 2 | 3 | 4 {
  if (count <= 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;

  const candidates: Array<2 | 3 | 4> = [2, 3, 4];
  const viable = candidates.filter((cols) => count % cols !== 1);
  const pool = viable.length > 0 ? viable : candidates;

  let best = pool[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const cols of pool) {
    const remainder = count % cols;
    const rows = Math.ceil(count / cols);
    let score = 0;
    if (remainder === 0) score += 100;
    score += 50 - rows;
    if (cols === 3) score += 3;
    if (cols === 4) score += 2;
    if (cols === 2) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = cols;
    }
  }

  return best;
}

function xlColsClass(cols: 2 | 3 | 4) {
  if (cols === 2) return "xl:grid-cols-2";
  if (cols === 3) return "xl:grid-cols-3";
  return "xl:grid-cols-4";
}

function itemStartClasses(count: number, cols: 2 | 3 | 4): string[] {
  const starts = new Array(count).fill("");
  const remainder = count % cols;
  if (remainder === 0) return starts;

  const lastRowStart = count - remainder;
  if (cols === 3 && remainder === 2) {
    starts[lastRowStart] = "xl:col-start-1";
    starts[lastRowStart + 1] = "xl:col-start-3";
    return starts;
  }
  if (cols === 4 && remainder === 2) {
    starts[lastRowStart] = "xl:col-start-1";
    starts[lastRowStart + 1] = "xl:col-start-3";
    return starts;
  }
  if (cols === 4 && remainder === 3) {
    starts[lastRowStart] = "xl:col-start-1";
    starts[lastRowStart + 1] = "xl:col-start-2";
    starts[lastRowStart + 2] = "xl:col-start-4";
  }

  return starts;
}

export function planCardGrid(count: number): CardGridPlan {
  if (count <= 0) {
    return {
      cols: 3,
      mobileColsClass: "grid-cols-1",
      tabletColsClass: "md:grid-cols-2",
      desktopColsClass: "xl:grid-cols-3",
      itemStartClass: [],
    };
  }

  if (count > 16) {
    return {
      cols: 4,
      mobileColsClass: "grid-cols-1",
      tabletColsClass: "md:grid-cols-2",
      desktopColsClass: "xl:grid-cols-4",
      itemStartClass: new Array(count).fill(""),
    };
  }

  const cols = pickCols(count);
  return {
    cols,
    mobileColsClass: "grid-cols-1",
    tabletColsClass: "md:grid-cols-2",
    desktopColsClass: xlColsClass(cols),
    itemStartClass: itemStartClasses(count, cols),
  };
}
