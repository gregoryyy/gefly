// Use Node's supported per-file summaries to distinguish declared tests from
// the runner's successful-file fallback for files that declare no tests.
// https://nodejs.org/api/test.html#event-testsummary
export default async function* assuranceReporter(events) {
  for await (const event of events) {
    if (event.type === 'test:summary') {
      const { file, success, counts } = event.data;
      yield `GEFLY-ASSURE-RESULT ${JSON.stringify({ file: file ?? null, success, counts })}\n`;
    } else if (event.type === 'test:fail') {
      yield `Node test failure: ${JSON.stringify(event.data)}\n`;
    } else if (event.type === 'test:diagnostic' && event.data.message) {
      yield `Node diagnostic: ${JSON.stringify(event.data.message)}\n`;
    }
  }
}
