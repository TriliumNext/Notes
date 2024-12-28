export function trimIndentation(strings: TemplateStringsArray) {
    const str = strings.toString();

    // Count the number of spaces on the first line.
    let numSpaces = 0;
    while (str.charAt(numSpaces) == ' ' && numSpaces < str.length) {
        numSpaces++;
    }

    // Trim the indentation of the first line in all the lines.
    const lines = str.split("\n");
    const output = [];
    for (let i=0; i<lines.length; i++) {
        let numSpacesLine = 0;
        while (str.charAt(numSpacesLine) == ' ' && numSpacesLine < str.length) {
            numSpacesLine++;
        }
        output.push(lines[i].substring(numSpacesLine));
    }
    return output.join("\n");
}
