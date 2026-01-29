import { TextBuffer, attributesWithLink, RGBA, createTextAttributes } from "@opentui/core";

async function testLinkRendering() {
  const lib = await import("@opentui/core-linux-x64");
  
  // Create a text buffer with a link
  const buffer = TextBuffer.create("unicode");
  
  // Add styled text with a link
  buffer.setStyledText([{
    __isChunk: true,
    text: "Click here",
    fg: RGBA.fromValues(0, 1, 1, 1), // cyan
    bg: undefined,
    attributes: createTextAttributes({ underline: true }),
    link: { url: "https://example.com" }
  }]);
  
  // Get the plain text to see what would be rendered
  const plainText = buffer.getPlainText();
  console.log("Plain text:", plainText);
  
  // Check if hyperlink capability is detected
  console.log("\nTo verify OSC 8 output, run the app and check:");
  console.log("1. Terminal supports OSC 8 (most modern terminals do)");
  console.log("2. Hyperlink capability is detected");
  console.log("3. Links are rendered with \\x1b]8;;url\\x1b\\\\text\\x1b]8;;\\x1b\\\\ sequences");
}

testLinkRendering().catch(console.error);
