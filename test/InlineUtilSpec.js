describe("Inline utilities function", function () {
    describe("clone", function () {
        it("should create a copy of the given object", function () {
            var input = {anOption: '1', yetAnotherOption: '21'},
                output;

            output = inlineUtil.clone(input);

            expect(input).toEqual(output);
            expect(input).not.toBe(output);
        });
    });

    describe("joinUrl", function () {
        it("should append the url to a directory-only base", function () {
            var url = inlineUtil.joinUrl("rel/path/", "the_relative_url");
            expect(url).toEqual("rel/path/the_relative_url");
        });

        it("should append the url to a file base", function () {
            var url = inlineUtil.joinUrl("rel/path/something", "the_relative_url");
            expect(url).toEqual("rel/path/the_relative_url");
        });

        it("should merge ../ with a directory-only base", function () {
            var url = inlineUtil.joinUrl("rel/path/", "../the_relative_url");
            expect(url).toEqual("rel/the_relative_url");
        });

        it("should just return the url if absolute", function () {
            var url = inlineUtil.joinUrl("rel/path/", "/the_relative_url");
            expect(url).toEqual("/the_relative_url");
        });

        it("should combine a url starting with '/' with the host of the base", function () {
            var url = inlineUtil.joinUrl("http://example.com/rel/path/", "/the_relative_url");
            expect(url).toEqual("http://example.com/the_relative_url");
        });

        it("should ignore base with an absolute url", function () {
            var url = inlineUtil.joinUrl("http://example.com/rel/path/", "http://github.com//the_relative_url");
            expect(url).toEqual("http://github.com//the_relative_url");
        });

        it("should ignore base without directories", function () {
            var url = inlineUtil.joinUrl("aFile", "anotherFile");
            expect(url).toEqual("anotherFile");
        });

        it("should ignore an undefined base", function () {
            var url = inlineUtil.joinUrl(undefined, "aFile");
            expect(url).toEqual("aFile");
        });

        it("should keep a relative base URL", function () {
            var url = inlineUtil.joinUrl("../rel/path/", "the_relative_url");
            expect(url).toEqual("../rel/path/the_relative_url");
        });
    });
});
