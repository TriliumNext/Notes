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

describe.todo("#sanitizeFilenameForHeader", () => {});

describe.todo("#getContentDisposition", () => {});

describe.todo("#isStringNote", () => {});

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

describe.todo("#getNoteTitle", () => {});

describe.todo("#timeLimit", () => {});

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