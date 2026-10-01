import fs from 'fs';
const file = 'backend/src/tests/end-to-end-evaluation.test.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('console.log("Baseline FP:", report.baseline.falsePositiveRate, "Full FP:", report.full.falsePositiveRate);', 'console.log("Baseline FP:", report.baseline.falsePositiveRate, "Full FP:", report.full.falsePositiveRate, "Baseline PossDiscovered:", report.baseline.possibilitiesDiscovered, "ValidRetained:", report.baseline.validPossibilitiesRetained);');
fs.writeFileSync(file, content);
