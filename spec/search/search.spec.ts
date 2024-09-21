import searchService from "../../src/services/search/services/search.js";
import BNote from "../../src/becca/entities/bnote.js";
import BBranch from "../../src/becca/entities/bbranch.js";
import SearchContext from "../../src/services/search/search_context.js";
import dateUtils from "../../src/services/date_utils.js";
import becca from "../../src/becca/becca.js";
import becca_mocking from "./becca_mocking.js";

describe('Search', () => {
    let rootNote: any;

    beforeEach(() => {
        becca.reset();

        rootNote = new becca_mocking.NoteBuilder(new BNote({ noteId: 'root', title: 'root', type: 'text' }));
        new BBranch({
            branchId: 'none_root',
            noteId: 'root',
            parentNoteId: 'none',
            notePosition: 10,
        });
    });

    xit('simple path match', () => {
        rootNote.child(becca_mocking.note('Europe').child(becca_mocking.note('Austria')));

        const searchContext = new SearchContext();
        const searchResults = searchService.findResultsWithQuery('europe austria', searchContext);

        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    xit('normal search looks also at attributes', () => {
        const austria = becca_mocking.note('Austria');
        const vienna = becca_mocking.note('Vienna');

        rootNote.child(austria.relation('capital', vienna.note)).child(vienna.label('inhabitants', '1888776'));

        const searchContext = new SearchContext();
        let searchResults = searchService.findResultsWithQuery('capital', searchContext);

        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('inhabitants', searchContext);

        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Vienna')).toBeTruthy();
    });

    xit('normal search looks also at type and mime', () => {
        rootNote
            .child(becca_mocking.note('Effective Java', { type: 'book', mime: '' }))
            .child(becca_mocking.note('Hello World.java', { type: 'code', mime: 'text/x-java' }));

        const searchContext = new SearchContext();
        let searchResults = searchService.findResultsWithQuery('book', searchContext);

        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Effective Java')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('text', searchContext); // should match mime

        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Hello World.java')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('java', searchContext);

        expect(searchResults.length).toEqual(2);
    });

    xit('only end leafs are results', () => {
        rootNote.child(becca_mocking.note('Europe').child(becca_mocking.note('Austria')));

        const searchContext = new SearchContext();
        const searchResults = searchService.findResultsWithQuery('europe', searchContext);

        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Europe')).toBeTruthy();
    });

    xit('only end leafs are results', () => {
        rootNote.child(becca_mocking.note('Europe').child(becca_mocking.note('Austria').label('capital', 'Vienna')));

        const searchContext = new SearchContext();

        const searchResults = searchService.findResultsWithQuery('Vienna', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    it('label comparison with short syntax', () => {
        rootNote.child(
            becca_mocking
                .note('Europe')
                .child(becca_mocking.note('Austria').label('capital', 'Vienna'))
                .child(becca_mocking.note('Czech Republic').label('capital', 'Prague'))
        );

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('#capital=Vienna', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();

        // case sensitivity:
        searchResults = searchService.findResultsWithQuery('#CAPITAL=VIENNA', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('#caPItal=vienNa', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    it('label comparison with full syntax', () => {
        rootNote.child(
            becca_mocking
                .note('Europe')
                .child(becca_mocking.note('Austria').label('capital', 'Vienna'))
                .child(becca_mocking.note('Czech Republic').label('capital', 'Prague'))
        );

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# note.labels.capital=Prague', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
    });

    it('numeric label comparison', () => {
        rootNote.child(
            becca_mocking
                .note('Europe')
                .label('country', '', true)
                .child(becca_mocking.note('Austria').label('population', '8859000'))
                .child(becca_mocking.note('Czech Republic').label('population', '10650000'))
        );

        const searchContext = new SearchContext();

        const searchResults = searchService.findResultsWithQuery('#country #population >= 10000000', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
    });

    xit('inherited label comparison', () => {
        rootNote.child(
            becca_mocking
                .note('Europe')
                .label('country', '', true)
                .child(becca_mocking.note('Austria'))
                .child(becca_mocking.note('Czech Republic'))
        );

        const searchContext = new SearchContext();

        const searchResults = searchService.findResultsWithQuery('austria #country', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    it('numeric label comparison fallback to string comparison', () => {
        // dates should not be coerced into numbers which would then give wrong numbers

        rootNote.child(
            becca_mocking
                .note('Europe')
                .label('country', '', true)
                .child(becca_mocking.note('Austria').label('established', '1955-07-27'))
                .child(becca_mocking.note('Czech Republic').label('established', '1993-01-01'))
                .child(becca_mocking.note('Hungary').label('established', '1920-06-04'))
        );

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('#established <= "1955-01-01"', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Hungary')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('#established > "1955-01-01"', searchContext);
        expect(searchResults.length).toEqual(2);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
    });

    it('smart date comparisons', () => {
        // dates should not be coerced into numbers which would then give wrong numbers

        rootNote.child(
            becca_mocking
                .note('My note', { dateCreated: dateUtils.localNowDateTime() })
                .label('year', new Date().getFullYear().toString())
                .label('month', dateUtils.localNowDate().substr(0, 7))
                .label('date', dateUtils.localNowDate())
                .label('dateTime', dateUtils.localNowDateTime())
        );

        const searchContext = new SearchContext();

        function test(query: string, expectedResultCount: number) {
            const searchResults = searchService.findResultsWithQuery(query, searchContext);
            expect(searchResults.length)
                .withContext(`While searching for ${query} got unexpected result: [${searchResults.join(", ")}]`)
                .toEqual(expectedResultCount);

            if (expectedResultCount === 1) {
                expect(becca_mocking.findNoteByTitle(searchResults, 'My note')).toBeTruthy();
            }
        }

        test('#year = YEAR', 1);
        test("#year = 'YEAR'", 0);
        test('#year >= YEAR', 1);
        test('#year <= YEAR', 1);
        test('#year < YEAR+1', 1);
        test('#year < YEAR + 1', 1);
        test('#year < year + 1', 1);
        test('#year > YEAR+1', 0);

        test('#month = MONTH', 1);
        test('#month = month', 1);
        test("#month = 'MONTH'", 0);

        test('note.dateCreated =* month', 2);

        test('#date = TODAY', 1);
        test('#date = today', 1);
        test("#date = 'today'", 0);
        test('#date > TODAY', 0);
        test('#date > TODAY-1', 1);
        test('#date > TODAY - 1', 1);
        test('#date < TODAY+1', 1);
        test('#date < TODAY + 1', 1);
        test("#date < 'TODAY + 1'", 1);

        test('#dateTime <= NOW+10', 1);
        test('#dateTime <= NOW + 10', 1);
        test('#dateTime < NOW-10', 0);
        test('#dateTime >= NOW-10', 1);
        test('#dateTime < NOW-10', 0);
    });

    it('logical or', () => {
        rootNote.child(
            becca_mocking
                .note('Europe')
                .label('country', '', true)
                .child(becca_mocking.note('Austria').label('languageFamily', 'germanic'))
                .child(becca_mocking.note('Czech Republic').label('languageFamily', 'slavic'))
                .child(becca_mocking.note('Hungary').label('languageFamily', 'finnougric'))
        );

        const searchContext = new SearchContext();

        const searchResults = searchService.findResultsWithQuery('#languageFamily = slavic OR #languageFamily = germanic', searchContext);
        expect(searchResults.length).toEqual(2);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    it('fuzzy attribute search', () => {
        rootNote.child(
            becca_mocking
                .note('Europe')
                .label('country', '', true)
                .child(becca_mocking.note('Austria').label('languageFamily', 'germanic'))
                .child(becca_mocking.note('Czech Republic').label('languageFamily', 'slavic'))
        );

        let searchContext = new SearchContext({ fuzzyAttributeSearch: false });

        let searchResults = searchService.findResultsWithQuery('#language', searchContext);
        expect(searchResults.length).toEqual(0);

        searchResults = searchService.findResultsWithQuery('#languageFamily=ger', searchContext);
        expect(searchResults.length).toEqual(0);

        searchContext = new SearchContext({ fuzzyAttributeSearch: true });

        searchResults = searchService.findResultsWithQuery('#language', searchContext);
        expect(searchResults.length).toEqual(2);

        searchResults = searchService.findResultsWithQuery('#languageFamily=ger', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    it('filter by note property', () => {
        rootNote.child(becca_mocking.note('Europe').child(becca_mocking.note('Austria')).child(becca_mocking.note('Czech Republic')));

        const searchContext = new SearchContext();

        const searchResults = searchService.findResultsWithQuery('# note.title =* czech', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
    });

    it("filter by note's parent", () => {
        rootNote
            .child(
                becca_mocking
                    .note('Europe')
                    .child(becca_mocking.note('Austria'))
                    .child(becca_mocking.note('Czech Republic').child(becca_mocking.note('Prague')))
            )
            .child(becca_mocking.note('Asia').child(becca_mocking.note('Taiwan')));

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# note.parents.title = Europe', searchContext);
        expect(searchResults.length).toEqual(2);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('# note.parents.title = Asia', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Taiwan')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('# note.parents.parents.title = Europe', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Prague')).toBeTruthy();
    });

    it("filter by note's ancestor", () => {
        rootNote
            .child(
                becca_mocking
                    .note('Europe')
                    .child(becca_mocking.note('Austria'))
                    .child(becca_mocking.note('Czech Republic').child(becca_mocking.note('Prague').label('city')))
            )
            .child(becca_mocking.note('Asia').child(becca_mocking.note('Taiwan').child(becca_mocking.note('Taipei').label('city'))));

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('#city AND note.ancestors.title = Europe', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Prague')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('#city AND note.ancestors.title = Asia', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Taipei')).toBeTruthy();
    });

    it("filter by note's child", () => {
        rootNote
            .child(
                becca_mocking
                    .note('Europe')
                    .child(becca_mocking.note('Austria').child(becca_mocking.note('Vienna')))
                    .child(becca_mocking.note('Czech Republic').child(becca_mocking.note('Prague')))
            )
            .child(becca_mocking.note('Oceania').child(becca_mocking.note('Australia')));

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# note.children.title =* Aust', searchContext);
        expect(searchResults.length).toEqual(2);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Europe')).toBeTruthy();
        expect(becca_mocking.findNoteByTitle(searchResults, 'Oceania')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery(
            '# note.children.title =* Aust AND note.children.title *= republic',
            searchContext
        );
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Europe')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('# note.children.children.title = Prague', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Europe')).toBeTruthy();
    });

    it("filter by relation's note properties using short syntax", () => {
        const austria = becca_mocking.note('Austria');
        const portugal = becca_mocking.note('Portugal');

        rootNote.child(
            becca_mocking
                .note('Europe')
                .child(austria)
                .child(becca_mocking.note('Czech Republic').relation('neighbor', austria.note))
                .child(portugal)
                .child(becca_mocking.note('Spain').relation('neighbor', portugal.note))
        );

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# ~neighbor.title = Austria', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('# ~neighbor.title = Portugal', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Spain')).toBeTruthy();
    });

    it("filter by relation's note properties using long syntax", () => {
        const austria = becca_mocking.note('Austria');
        const portugal = becca_mocking.note('Portugal');

        rootNote.child(
            becca_mocking
                .note('Europe')
                .child(austria)
                .child(becca_mocking.note('Czech Republic').relation('neighbor', austria.note))
                .child(portugal)
                .child(becca_mocking.note('Spain').relation('neighbor', portugal.note))
        );

        const searchContext = new SearchContext();

        const searchResults = searchService.findResultsWithQuery('# note.relations.neighbor.title = Austria', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
    });

    it('filter by multiple level relation', () => {
        const austria = becca_mocking.note('Austria');
        const slovakia = becca_mocking.note('Slovakia');
        const italy = becca_mocking.note('Italy');
        const ukraine = becca_mocking.note('Ukraine');

        rootNote.child(
            becca_mocking
                .note('Europe')
                .child(austria.relation('neighbor', italy.note).relation('neighbor', slovakia.note))
                .child(becca_mocking.note('Czech Republic').relation('neighbor', austria.note).relation('neighbor', slovakia.note))
                .child(slovakia.relation('neighbor', ukraine.note))
                .child(ukraine)
        );

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# note.relations.neighbor.relations.neighbor.title = Italy', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();

        searchResults = searchService.findResultsWithQuery('# note.relations.neighbor.relations.neighbor.title = Ukraine', searchContext);
        expect(searchResults.length).toEqual(2);
        expect(becca_mocking.findNoteByTitle(searchResults, 'Czech Republic')).toBeTruthy();
        expect(becca_mocking.findNoteByTitle(searchResults, 'Austria')).toBeTruthy();
    });

    it('test note properties', () => {
        const austria = becca_mocking.note('Austria');

        austria.relation('myself', austria.note);
        austria.label('capital', 'Vienna');
        austria.label('population', '8859000');

        rootNote
            .child(becca_mocking.note('Asia'))
            .child(
                becca_mocking.note('Europe').child(austria.child(becca_mocking.note('Vienna')).child(becca_mocking.note('Sebastian Kurz')))
            )
            .child(becca_mocking.note('Mozart').child(austria));

        austria.note.isProtected = false;
        austria.note.dateCreated = '2020-05-14 12:11:42.001+0200';
        austria.note.dateModified = '2020-05-14 13:11:42.001+0200';
        austria.note.utcDateCreated = '2020-05-14 10:11:42.001Z';
        austria.note.utcDateModified = '2020-05-14 11:11:42.001Z';
        // austria.note.contentLength = 1001;

        const searchContext = new SearchContext();

        function test(propertyName: string, value: string, expectedResultCount: number) {
            const searchResults = searchService.findResultsWithQuery(`# note.${propertyName} = ${value}`, searchContext);
            expect(searchResults.length).toEqual(expectedResultCount);
        }

        test('type', 'text', 7);
        test('TYPE', 'TEXT', 7);
        test('type', 'code', 0);

        test('mime', 'text/html', 6);
        test('mime', 'application/json', 0);

        test('isProtected', 'false', 7);
        test('isProtected', 'FALSE', 7);
        test('isProtected', 'true', 0);
        test('isProtected', 'TRUE', 0);

        test('dateCreated', "'2020-05-14 12:11:42.001+0200'", 1);
        test('dateCreated', 'wrong', 0);

        test('dateModified', "'2020-05-14 13:11:42.001+0200'", 1);
        test('dateModified', 'wrong', 0);

        test('utcDateCreated', "'2020-05-14 10:11:42.001Z'", 1);
        test('utcDateCreated', 'wrong', 0);

        test('utcDateModified', "'2020-05-14 11:11:42.001Z'", 1);
        test('utcDateModified', 'wrong', 0);

        test('parentCount', '2', 1);
        test('parentCount', '3', 0);

        test('childrenCount', '2', 1);
        test('childrenCount', '10', 0);

        test('attributeCount', '3', 1);
        test('attributeCount', '4', 0);

        test('labelCount', '2', 1);
        test('labelCount', '3', 0);

        test('relationCount', '1', 1);
        test('relationCount', '2', 0);
    });

    it('test order by', () => {
        const italy = becca_mocking.note('Italy').label('capital', 'Rome');
        const slovakia = becca_mocking.note('Slovakia').label('capital', 'Bratislava');
        const austria = becca_mocking.note('Austria').label('capital', 'Vienna');
        const ukraine = becca_mocking.note('Ukraine').label('capital', 'Kiev');

        rootNote.child(becca_mocking.note('Europe').child(ukraine).child(slovakia).child(austria).child(italy));

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# note.parents.title = Europe orderBy note.title', searchContext);
        expect(searchResults.length).toEqual(4);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Austria');
        expect(becca.notes[searchResults[1].noteId].title).toEqual('Italy');
        expect(becca.notes[searchResults[2].noteId].title).toEqual('Slovakia');
        expect(becca.notes[searchResults[3].noteId].title).toEqual('Ukraine');

        searchResults = searchService.findResultsWithQuery('# note.parents.title = Europe orderBy note.labels.capital', searchContext);
        expect(searchResults.length).toEqual(4);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Slovakia');
        expect(becca.notes[searchResults[1].noteId].title).toEqual('Ukraine');
        expect(becca.notes[searchResults[2].noteId].title).toEqual('Italy');
        expect(becca.notes[searchResults[3].noteId].title).toEqual('Austria');

        searchResults = searchService.findResultsWithQuery('# note.parents.title = Europe orderBy note.labels.capital DESC', searchContext);
        expect(searchResults.length).toEqual(4);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Austria');
        expect(becca.notes[searchResults[1].noteId].title).toEqual('Italy');
        expect(becca.notes[searchResults[2].noteId].title).toEqual('Ukraine');
        expect(becca.notes[searchResults[3].noteId].title).toEqual('Slovakia');

        searchResults = searchService.findResultsWithQuery(
            '# note.parents.title = Europe orderBy note.labels.capital DESC limit 2',
            searchContext
        );
        expect(searchResults.length).toEqual(2);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Austria');
        expect(becca.notes[searchResults[1].noteId].title).toEqual('Italy');

        searchResults = searchService.findResultsWithQuery('# note.parents.title = Europe orderBy #capital DESC limit 1', searchContext);
        expect(searchResults.length).toEqual(1);

        searchResults = searchService.findResultsWithQuery('# note.parents.title = Europe orderBy #capital DESC limit 1000', searchContext);
        expect(searchResults.length).toEqual(4);
    });

    it('test not(...)', () => {
        const italy = becca_mocking.note('Italy').label('capital', 'Rome');
        const slovakia = becca_mocking.note('Slovakia').label('capital', 'Bratislava');

        rootNote.child(becca_mocking.note('Europe').child(slovakia).child(italy));

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# not(#capital) and note.noteId != root', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Europe');

        searchResults = searchService.findResultsWithQuery('#!capital and note.noteId != root', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Europe');
    });

    xit('test note.text *=* something', () => {
        const italy = becca_mocking.note('Italy').label('capital', 'Rome');
        const slovakia = becca_mocking.note('Slovakia').label('capital', 'Bratislava');

        rootNote.child(becca_mocking.note('Europe').child(slovakia).child(italy));

        const searchContext = new SearchContext();

        let searchResults = searchService.findResultsWithQuery('# note.text *=* vaki and note.noteId != root', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Slovakia');
    });

    xit('test that fulltext does not match archived notes', () => {
        const italy = becca_mocking.note('Italy').label('capital', 'Rome');
        const slovakia = becca_mocking.note('Slovakia').label('capital', 'Bratislava');

        rootNote
            .child(
                becca_mocking
                    .note('Reddit')
                    .label('archived', '', true)
                    .child(becca_mocking.note('Post X'))
                    .child(becca_mocking.note('Post Y'))
            )
            .child(becca_mocking.note('Reddit is bad'));

        const searchContext = new SearchContext({ includeArchivedNotes: false });

        let searchResults = searchService.findResultsWithQuery('reddit', searchContext);
        expect(searchResults.length).toEqual(1);
        expect(becca.notes[searchResults[0].noteId].title).toEqual('Reddit is bad');
    });

    // FIXME: test what happens when we order without any filter criteria

    // it("comparison between labels", () => {
    //     rootNote
    //         .child(becca_mocking.note("Europe")
    //             .child(becca_mocking.note("Austria")
    //                 .label('capital', 'Vienna')
    //                 .label('largestCity', 'Vienna'))
    //             .child(becca_mocking.note("Canada")
    //                 .label('capital', 'Ottawa')
    //                 .label('largestCity', 'Toronto'))
    //             .child(becca_mocking.note("Czech Republic")
    //                 .label('capital', 'Prague')
    //                 .label('largestCity', 'Prague'))
    //         );
    //
    //     const searchContext = new SearchContext();
    //
    //     const searchResults = searchService.findResultsWithQuery('#capital = #largestCity', searchContext);
    //     expect(searchResults.length).toEqual(2);
    //     expect(becca_mocking.findNoteByTitle(searchResults, "Czech Republic")).toBeTruthy();
    //     expect(becca_mocking.findNoteByTitle(searchResults, "Austria")).toBeTruthy();
    // })
});
