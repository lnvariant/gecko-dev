"use strict";

const FILE_DUMMY_URL = Services.io.newFileURI(
  do_get_file("data/dummy_page.html")
).spec;

// ExtensionContent.jsm needs to know when it's running from xpcshell,
// to use the right timeout for content scripts executed at document_idle.
ExtensionTestUtils.mockAppInfo();

// XHR/fetch from content script to the page itself is allowed.
add_task(async function content_script_xhr_to_self() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["file:///*"],
          js: ["content_script.js"],
        },
      ],
    },
    files: {
      "content_script.js": async () => {
        let response = await fetch(document.URL);
        browser.test.assertEq(200, response.status, "expected load");
        let responseText = await response.text();
        browser.test.assertTrue(
          responseText.includes("<p>Page</p>"),
          `expected file content in response of ${response.url}`
        );

        // Now with content.fetch:
        response = await content.fetch(document.URL);
        browser.test.assertEq(200, response.status, "expected load (content)");

        browser.test.sendMessage("done");
      },
    },
  });

  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(FILE_DUMMY_URL);
  await extension.awaitMessage("done");
  await contentPage.close();

  await extension.unload();
});

// XHR/fetch for other file is not allowed, even with file://-permissions.
add_task(async function content_script_xhr_to_other_file_not_allowed() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["file:///*"],
      content_scripts: [
        {
          matches: ["file:///*"],
          js: ["content_script.js"],
        },
      ],
    },
    files: {
      "content_script.js": async () => {
        let otherFileUrl = document.URL.replace(
          "dummy_page.html",
          "file_sample.html"
        );
        let x = new XMLHttpRequest();
        x.open("GET", otherFileUrl);
        await new Promise(resolve => {
          x.onloadend = resolve;
          x.send();
        });
        browser.test.assertEq(0, x.status, "expected error");
        browser.test.assertEq("", x.responseText, "request should fail");

        // Now with content.XMLHttpRequest.
        x = new content.XMLHttpRequest();
        x.open("GET", otherFileUrl);
        x.onloadend = () => {
          browser.test.assertEq(0, x.status, "expected error (content)");
          browser.test.sendMessage("done");
        };
        x.send();
      },
    },
  });

  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(FILE_DUMMY_URL);
  await extension.awaitMessage("done");
  await contentPage.close();

  await extension.unload();
});

// "file://" permission does not grant access to files in the extension page.
add_task(async function file_access_from_extension_page_not_allowed() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["file:///*"],
      description: FILE_DUMMY_URL,
    },
    async background() {
      const FILE_DUMMY_URL = browser.runtime.getManifest().description;

      await browser.test.assertRejects(
        fetch(FILE_DUMMY_URL),
        /NetworkError when attempting to fetch resource/,
        "block request to file from background page despite file permission"
      );

      // Regression test for bug 1420296 .
      await browser.test.assertRejects(
        fetch(FILE_DUMMY_URL, { mode: "same-origin" }),
        /NetworkError when attempting to fetch resource/,
        "block request to file from background page despite 'same-origin' mode"
      );

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();

  await extension.awaitMessage("done");

  await extension.unload();
});
