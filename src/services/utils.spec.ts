import { describe, it, expect } from "vitest";
import utils from "./utils.js";

type TestCase<T extends (...args: any) => any> = [desc: string, fnParams: Parameters<T>, expected: ReturnType<T>];

describe("#newEntityId", () => {

  it("should return a string with a length of 12", () => {
    const result = utils.newEntityId();
    expect(result).toBeTypeOf("string");
    expect(result).toHaveLength(12);
  });

});

describe("#randomString", () => {

  it("should return a string with a length as per argument", () => {
    const stringLength = 5;
    const result = utils.randomString(stringLength);
    expect(result).toBeTypeOf("string");
    expect(result).toHaveLength(stringLength);
  });

});

describe.todo("#randomSecureToken", () => {});

describe.todo("#md5", () => {});

describe.todo("#hashedBlobId", () => {});

describe.todo("#toBase64", () => {});

describe.todo("#fromBase64", () => {});

describe.todo("#hmac", () => {});

describe.todo("#hash", () => {});

describe("#isEmptyOrWhitespace", () => {

  const testCases: TestCase<typeof utils.isEmptyOrWhitespace>[] = [
    ["w/ 'null' it should return true", [null], true],
    ["w/ 'null' it should return true", [null], true],
    ["w/ undefined it should return true", [undefined], true],
    ["w/ empty string '' it should return true", [""], true],
    ["w/ single whitespace string ' ' it should return true", [" "], true],
    ["w/ multiple whitespace string '   ' it should return true", ["  "], true],
    ["w/ non-empty string ' t  ' it should return false", [" t  "], false],
  ];

  testCases.forEach(testCase => {
    const [desc, fnParams, expected] = testCase;
    it(desc, () => {
      const result = utils.isEmptyOrWhitespace(...fnParams);
      expect(result).toStrictEqual(expected);
    })
  })

});

describe("#sanitizeSqlIdentifier", () => {

  const testCases: TestCase<typeof utils.sanitizeSqlIdentifier>[] = [
    ["w/ 'test' it should not strip anything", ["test"], "test"],
    ["w/ 'test123' it should not strip anything", ["test123"], "test123"],
    ["w/ 'tEst_TeSt' it should not strip anything", ["tEst_TeSt"], "tEst_TeSt"],
    ["w/ 'test_test' it should not strip '_'", ["test_test"], "test_test"],
    ["w/ 'test-' it should strip the '-'", ["test-"], "test"],
    ["w/ 'test-test' it should strip the '-'", ["test-test"], "testtest"],
    ["w/ 'test; --test' it should strip the '; --'", ["test; --test"], "testtest"],
    ["w/ 'test test' it should strip the ' '", ["test test"], "testtest"],
  ];

  testCases.forEach(testCase => {
    const [desc, fnParams, expected] = testCase;
    it(desc, () => {
      const result = utils.sanitizeSqlIdentifier(...fnParams);
      expect(result).toStrictEqual(expected);
    })
  });

});

describe.todo("#escapeHtml", () => {});

describe.todo("#unescapeHtml", () => {});

describe.todo("#toObject", () => {});

describe("#stripTags", () => {

    //pre
    const htmlWithNewlines =
`<p>abc
def</p>
<p>ghi</p>`;

    const testCases: TestCase<typeof utils.stripTags>[] = [
        ["should strip all tags and only return the content, leaving new lines and spaces in tact", [htmlWithNewlines], "abc\ndef\nghi"],
        //TriliumNextTODO: should this actually insert a space between content to prevent concatenated text?
        ["should strip all tags and only return the content", ["<h1>abc</h1><p>def</p>"], "abcdef"],
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
          const result = utils.stripTags(...fnParams);
          expect(result).toStrictEqual(expected);
        })
    });
});

describe.todo("#escapeRegExp", () => {});

describe.todo("#crash", () => {});

describe("#getContentDisposition", () => {

    const defaultFallBackDisposition = `file; filename="file"; filename*=UTF-8''file`;
    const testCases: TestCase<typeof utils.getContentDisposition>[] = [
        [
            "when passed filename is empty, it should fallback to default value 'file'", 
            [" "],
            defaultFallBackDisposition
        ],
        [
            "when passed filename '..' would cause sanitized filename to be empty, it should fallback to default value 'file'", 
            [".."],
            defaultFallBackDisposition
        ],
        // COM1 is a Windows specific "illegal filename" that sanitize filename strips away
        [
            "when passed filename 'COM1' would cause sanitized filename to be empty, it should fallback to default value 'file'",
            ["COM1"],
            defaultFallBackDisposition
        ],
        [
            "sanitized passed filename should be returned URIEncoded",
            ["test file.csv"],
            `file; filename="test%20file.csv"; filename*=UTF-8''test%20file.csv`
        ]
    ]

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.getContentDisposition(...fnParams);
            expect(result).toStrictEqual(expected);
        })
    });
});

describe("#isStringNote", () => {

    const testCases: TestCase<typeof utils.isStringNote>[] = [
        [
            "w/ 'undefined' note type, but a string mime type, it should return true",
            [undefined, "application/javascript"],
            true
        ],
        [
            "w/ non-string note type, it should return false",
            ["image", "image/jpeg"],
            false
        ],
        [
            "w/ string note type (text), it should return true",
            ["text", "text/html"],
            true
        ],
        [
            "w/ string note type (code), it should return true",
            ["code", "application/json"],
            true
        ],
        [
            "w/ non-string note type (file), but string mime type, it should return true",
            ["file", "application/json"],
            true
        ],
        [
            "w/ non-string note type (file), but mime type starting with 'text/', it should return true",
            ["file", "text/html"],
            true
        ],
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.isStringNote(...fnParams);
            expect(result).toStrictEqual(expected);
          });
    });
});

describe.todo("#quoteRegex", () => {});

describe.todo("#replaceAll", () => {});

// TriliumNextTODO move existing formatDownloadTitle in here
// describe.todo("#formatDownloadTitle", () => {});

describe("#removeTextFileExtension", () => {
    const testCases: TestCase<typeof utils.removeTextFileExtension>[] = [
        ["w/ 'test.md' it should strip '.md'", ["test.md"], "test"],
        ["w/ 'test.markdown' it should strip '.markdown'", ["test.markdown"], "test"],
        ["w/ 'test.html' it should strip '.html'", ["test.html"], "test"],
        ["w/ 'test.htm' it should strip '.htm'", ["test.htm"], "test"],
        ["w/ 'test.zip' it should NOT strip '.zip'", ["test.zip"], "test.zip"],
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.removeTextFileExtension(...fnParams);
            expect(result).toStrictEqual(expected);
          });
    });

});

describe("#getNoteTitle", () => {
    const testCases: TestCase<typeof utils.getNoteTitle>[] = [
        [
          "when file has no spaces, and no special file extension, it should return the filename unaltered",
          ["test.json", true, undefined],
          "test.json"
        ],
        [
          "when replaceUnderscoresWithSpaces is false, it should keep the underscores in the title",
          ["test_file.json", false, undefined],
          "test_file.json"
        ],
        [
          "when replaceUnderscoresWithSpaces is true, it should replace the underscores in the title",
          ["test_file.json", true, undefined],
          "test file.json"
        ],
        [
          "when filePath ends with one of the extra handled endings (.md), it should strip the file extension from the title",
          ["test_file.md", false, undefined],
          "test_file"
        ],
        [
          "when filePath ends with one of the extra handled endings (.md) and replaceUnderscoresWithSpaces is true, it should strip the file extension from the title and replace underscores",
          ["test_file.md", true, undefined],
          "test file"
        ],
        [
          "when filepath contains a full path, it should only return the basename of the file",
          ["Trilium Demo/Scripting examples/Statistics/Most cloned notes/template.zip", true, undefined],
          "template.zip"
        ],
        [
          "when filepath contains a full path and has extra handled ending (.html), it should only return the basename of the file and strip the file extension",
          ["Trilium Demo/Scripting examples/Statistics/Most cloned notes/template.html", true, undefined],
          "template"
        ],
        [
          "when a noteMeta object is passed, it should use the title from the noteMeta, if present",
          //@ts-expect-error - passing in incomplete noteMeta - but we only care about the title prop here
          ["test_file.md", true, { title: "some other title"}],
          "some other title"
        ],
        [
          "when a noteMeta object is passed, but the title prop is empty, it should try to handle the filename as if no noteMeta was passed",
          //@ts-expect-error - passing in incomplete noteMeta - but we only care about the title prop here
          ["test_file.md", true, { title: ""}],
          "test file"
        ],
        [
            "when a noteMeta object is passed, but the title prop is empty, it should try to handle the filename as if no noteMeta was passed",
            //@ts-expect-error - passing in incomplete noteMeta - but we only care about the title prop here
            ["test_file.json", false, { title: " "}],
            "test_file.json"
        ]
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.getNoteTitle(...fnParams);
            expect(result).toStrictEqual(expected);
          });
    });

});

describe("#timeLimit", () => {

    it("when promise execution does NOT exceed timeout, it should resolve with promises' value", async () => {
        const resolvedValue = `resolved: ${new Date().toISOString()}`;
        const testPromise = new Promise((res, rej) => {
            setTimeout(() => {
                return res(resolvedValue);
            }, 200);
            //rej("rejected!");
        });
        expect(utils.timeLimit(testPromise, 1_000)).resolves.toBe(resolvedValue);
    });

    it("when promise execution rejects within timeout, it should return the original promises' rejected value, not the custom set one", async () => {
        const rejectedValue = `rejected: ${new Date().toISOString()}`;
        const testPromise = new Promise((res, rej) => {
            setTimeout(() => {
                //return res("resolved");
                rej(rejectedValue);
            }, 100);
        });
        expect(utils.timeLimit(testPromise, 200, "Custom Error")).rejects.toThrow(rejectedValue)
    });

    it("when promise execution exceeds the set timeout, and 'errorMessage' is NOT set, it should reject the promise and display default error message", async () => {
        const testPromise = new Promise((res, rej) => {
            setTimeout(() => {
                return res("resolved");
            }, 500);
            //rej("rejected!");
        });
        expect(utils.timeLimit(testPromise, 200)).rejects.toThrow(`Process exceeded time limit 200`)
    });

    it("when promise execution exceeds the set timeout, and 'errorMessage' is set, it should reject the promise and display set error message", async () => {
        const customErrorMsg = "Custom Error";
        const testPromise = new Promise((res, rej) => {
            setTimeout(() => {
                return res("resolved");
            }, 500);
            //rej("rejected!");
        });
        expect(utils.timeLimit(testPromise, 200, customErrorMsg)).rejects.toThrow(customErrorMsg)
    });

    // TriliumNextTODO: since TS avoids this from ever happening – do we need this check?
    it("when the passed promise is not a promise but 'undefined', it should return 'undefined'", async () => {
        //@ts-expect-error - passing in illegal type 'undefined'
        expect(utils.timeLimit(undefined, 200)).toBe(undefined)
    });

    // TriliumNextTODO: since TS avoids this from ever happening – do we need this check?
    it("when the passed promise is not a promise, it should return the passed value", async () => {
        //@ts-expect-error - passing in illegal type 'object'
        expect(utils.timeLimit({test: 1}, 200)).toStrictEqual({test: 1})
    });

});

describe.todo("#deferred", () => {});

describe("#removeDiacritic", () => {

    const testCases: TestCase<typeof utils.removeDiacritic>[] = [
        ["w/ 'Äpfel' it should replace the 'Ä'", ["Äpfel"], "Apfel"],
        ["w/ 'Été' it should replace the 'É' and 'é'", ["Été"], "Ete"],
        ["w/ 'Fête' it should replace the 'ê'", ["Fête"], "Fete"],
        ["w/ 'Αλφαβήτα' it should replace the 'ή'", ["Αλφαβήτα"], "Αλφαβητα"],
        ["w/ '' (empty string) it should return empty string", [""], ""],
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.removeDiacritic(...fnParams);
            expect(result).toStrictEqual(expected);
          });
    });
});


describe("#normalize", () => {

    const testCases: TestCase<typeof utils.normalize>[] = [
        ["w/ 'Äpfel' it should replace the 'Ä' and return lowercased", ["Äpfel"], "apfel"],
        ["w/ 'Été' it should replace the 'É' and 'é' and return lowercased", ["Été"], "ete"],
        ["w/ 'FêTe' it should replace the 'ê' and return lowercased", ["FêTe"], "fete"],
        ["w/ 'ΑλΦαβήΤα' it should replace the 'ή' and return lowercased", ["ΑλΦαβήΤα"], "αλφαβητα"],
        ["w/ '' (empty string) it should return empty string", [""], ""],
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.normalize(...fnParams);
            expect(result).toStrictEqual(expected);
          });
    });

});

describe.todo("#toMap", () => {});

describe("#envToBoolean", () => {
    const testCases: TestCase<typeof utils.envToBoolean>[] = [
        ["w/ 'true' it should return boolean 'true'", ["true"], true],
        ["w/ 'True' it should return boolean 'true'", ["True"], true],
        ["w/ 'TRUE' it should return boolean 'true'", ["TRUE"], true],
        ["w/ 'true ' it should return boolean 'true'", ["true "], true],
        ["w/ 'false' it should return boolean 'false'", ["false"], false],
        ["w/ 'False' it should return boolean 'false'", ["False"], false],
        ["w/ 'FALSE' it should return boolean 'false'", ["FALSE"], false],
        ["w/ 'false ' it should return boolean 'false'", ["false "], false],
        ["w/ 'whatever' (non-boolean string) it should return undefined", ["whatever"], undefined],
        ["w/ '-' (non-boolean string) it should return undefined", ["-"], undefined],
        ["w/ '' (empty string) it should return undefined", [""], undefined],
        ["w/ ' ' (white space string) it should return undefined", [" "], undefined],
        ["w/ undefined it should return undefined", [undefined], undefined],
        //@ts-expect-error - pass wrong type as param
        ["w/ number 1 it should return undefined", [1], undefined],
    ];

    testCases.forEach(testCase => {
        const [desc, fnParams, expected] = testCase;
        it(desc, () => {
            const result = utils.envToBoolean(...fnParams);
            expect(result).toStrictEqual(expected);
          });
    });
});

describe.todo("#getResourceDir", () => {});

describe("#isElectron", () => {
    it("should export a boolean", () => {
        expect(utils.isElectron).toBeTypeOf("boolean");
    });
});

describe("#isMac", () => {
    it("should export a boolean", () => {
        expect(utils.isMac).toBeTypeOf("boolean");
    });
});

describe("#isWindows", () => {
    it("should export a boolean", () => {
        expect(utils.isWindows).toBeTypeOf("boolean");
    });
});

describe("#isDev", () => {
    it("should export a boolean", () => {
        expect(utils.isDev).toBeTypeOf("boolean");
    });
});

describe("#formatDownloadTitle", () => {

    //prettier-ignore
    const testCases: [fnValue: Parameters<typeof utils.formatDownloadTitle>, expectedValue: ReturnType<typeof utils.formatDownloadTitle>][] = [

        // empty fileName tests
        [
            ["", "text", ""],
            "untitled.html"
        ],
        [
            ["", "canvas", ""],
            "untitled.json"
        ],
        [
            ["", null, ""],
            "untitled"
        ],


        // json extension from type tests
        [
            ["test_file", "canvas", ""],
            "test_file.json"
        ],
        [
            ["test_file", "relationMap", ""],
            "test_file.json"
        ],
        [
            ["test_file", "search", ""],
            "test_file.json"
        ],


        // extension based on mime type
        [
            ["test_file", null, "text/csv"],
            "test_file.csv"
        ],
        [
            ["test_file_wo_ext", "image", "image/svg+xml"],
            "test_file_wo_ext.svg"
        ],
        [
            ["test_file_wo_ext", "file", "application/json"],
            "test_file_wo_ext.json"
        ],
        [
            ["test_file_w_fake_ext.ext", "image", "image/svg+xml"],
            "test_file_w_fake_ext.ext.svg"
        ],
        [
            ["test_file_w_correct_ext.svg", "image", "image/svg+xml"],
            "test_file_w_correct_ext.svg"
        ],
        [
            ["test_file_w_correct_ext.svgz", "image", "image/svg+xml"],
            "test_file_w_correct_ext.svgz"
        ],
        [
            ["test_file.zip", "file", "application/zip"],
            "test_file.zip"
        ],
        [
            ["test_file", "file", "application/zip"],
            "test_file.zip"
        ],


        // application/octet-stream tests
        [
            ["test_file", "file", "application/octet-stream"],
            "test_file"
        ],
        [
            ["test_file.zip", "file", "application/octet-stream"],
            "test_file.zip"
        ],
        [
            ["test_file.unknown", null, "application/octet-stream"],
            "test_file.unknown"
        ],


        // sanitized filename tests
        [
            ["test/file", null, "application/octet-stream"],
            "testfile"
        ],
        [
            ["test:file.zip", "file", "application/zip"],
            "testfile.zip"
        ],
        [
            [":::", "file", "application/zip"],
            ".zip"
        ],
        [
            [":::a", "file", "application/zip"],
            "a.zip"
        ]
    ];

    testCases.forEach((testCase) => {
        const [fnParams, expected] = testCase;
        return it(`With args '${JSON.stringify(fnParams)}', it should return '${expected}'`, () => {
            const actual = utils.formatDownloadTitle(...fnParams);
            expect(actual).toStrictEqual(expected);
        });
    });
});