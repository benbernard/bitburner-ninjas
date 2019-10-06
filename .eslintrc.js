module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  env: {
    node: true,
    jquery: true,
    commonjs: true,
    es6: true,
  },
  globals: {
    $: true, // Client sometimes imports $
    Q: true, // Client has to import Q, server doesn't
    _: false,
    knex: true,
    mongooseHelpers: false,
    pgHelpers: false,
    argsHelpers: false,
    SQL: false,
    extendable: false,
    superExtendable: false,
    postExtendHookable: false,
    gettable: false,
    BaseObject: true,
    dev: true,
    Tips: false,
    logger: false,
    prequire: false,
    drequire: false,
    projpath: false,
    require: false,
    rootdir: false,
    site: false,
    util: true,
    mixpanel: false,
    ga: false,
    io: false,
    jobRegistry: false,
    O: false,
    DomainContext: false,
    FB: false,
    isMobile: false,
    Intercom: false,
    WheelEvent: false,
    FileReader: false,
    FormData: false,
    Tonic: false,
    env: true,
    cfg: false,
    outdent: true,
    AppError: false,
    defaultErrorHandler: false,
    s: false,
    template: false,
    ms: false,
    dlog: false,
    LOG_ALL: false,
    ArgumentsSlicer: false,
    testFlags: false,

    // Macros
    AddSignatures: false,
    IfUnset: false,
    me: false,

    // Browser globals, don't want to use preset in order to avoid things like
    // the global event
    window: false,
    document: false,
    navigator: false,

    // Testing related globals
    Delivery: false,
    server: false,
    chai: false,
    test: false,
    after: false,
    afterEach: false,
    anyAfter: false,
    before: false,
    beforeEach: false,
    anyBefore: false,
    describe: false,
    anyDescribe: false,
    describeSequence: false,
    expect: false,
    given: false,
    helpers: true,
    webdriver: true,
    pages: false,
    faker: true,
    Call: false,
    DeferredCall: false,
    client: false,
    it: false,
    anyIt: false,
    testUndo: false,
    scenarios: false,
    wait: false,
    promised: false,
    P: false,
    Fieldbook: false,
    ExternalForm: false,
    fixtures: true,
    circleTakeScreenshot: false,
    describeAndStash: false,
    DBVAL: false,
    autoMock: true,
    mobileSite: false,
    dieHardSite: false,
    ihmsSite: false,
    LLOG: false,
    Experiment: true,

    // Global symbols
    BYPASS_DEPRECATION: false, // used by the deprecate function builder to allow specific calls to a method
  },
  extends: "eslint:recommended",
  rules: {
    "no-undef": ["error", {typeof: false}],
    "no-unused-vars": "off",
    "accessor-pairs": "error",
    "array-bracket-spacing": ["error", "never"],
    "array-callback-return": "off",
    "arrow-body-style": "off",
    "arrow-parens": ["error", "as-needed"],
    "arrow-spacing": [
      "error",
      {
        after: true,
        before: true,
      },
    ],
    "block-scoped-var": "error",
    "block-spacing": "error",
    "brace-style": ["error", "1tbs", {allowSingleLine: true}],
    "callback-return": "off",
    camelcase: "error",
    "comma-dangle": [
      "error",
      {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
        functions: "only-multiline",
      },
    ],
    "comma-spacing": "error",
    "comma-style": ["error", "last"],
    complexity: "off",
    "computed-property-spacing": ["error", "never"],
    "consistent-return": "off",
    "consistent-this": "off",
    // The rule we want: only allow braceless in the case of 'if' (not else,
    // else if, etc), and if there is an 'else' or 'else if' clause on an if,
    // the if must have braces.
    // (not allowed by this built-in rule)
    curly: "off",
    "default-case": "off",
    "dot-location": ["error", "property"],
    "dot-notation": "off",
    "eol-last": "error",
    eqeqeq: ["error", "allow-null"],
    "func-names": "off",
    "func-style": "off",
    "generator-star-spacing": ["error", {before: true, after: true}],
    "global-require": "off",
    "guard-for-in": "error",
    "handle-callback-err": "error",
    "id-blacklist": "error",
    "id-length": "off",
    "id-match": "error",
    indent: ["error", 2, {SwitchCase: 1}],
    "init-declarations": "off",
    "jsx-quotes": "error",
    "key-spacing": ["error", {mode: "minimum"}],
    "keyword-spacing": "error",
    "linebreak-style": ["error", "unix"],
    "lines-around-comment": "off",
    "max-depth": "off",
    "max-len": ["error", {code: 150}],
    "max-lines": "off",
    "max-nested-callbacks": "off",
    "max-params": "off",
    "max-statements": "off",
    "max-statements-per-line": ["error", {max: 2}],
    "new-parens": "error",
    "newline-after-var": "off",
    "newline-before-return": "off",
    "newline-per-chained-call": "off",
    "no-alert": "off",
    "no-array-constructor": "error",
    "no-bitwise": "off",
    "no-caller": "error",
    "no-catch-shadow": "error",
    "no-confusing-arrow": "off",
    "no-constant-condition": "off",
    "no-continue": "off",
    "no-div-regex": "off",
    "no-duplicate-imports": "error",
    "no-else-return": "off",
    "no-empty": "error",
    "no-empty-function": "off",
    "no-eq-null": "off",
    "no-eval": "error",
    "no-extend-native": "off",
    "no-extra-bind": "off",
    "no-extra-label": "error",
    "no-extra-parens": "off",
    "no-floating-decimal": "error",
    "no-implicit-globals": "error",
    "no-implied-eval": "error",
    "no-inline-comments": "off",
    "no-inner-declarations": "off",
    "no-console": "off",
    "no-invalid-this": "off",
    "no-iterator": "error",
    "no-label-var": "error",
    "no-labels": "error",
    "no-lone-blocks": "error",
    "no-lonely-if": "error",
    "no-loop-func": "error",
    "no-magic-numbers": "off",
    "no-mixed-operators": "off",
    "no-mixed-requires": "error",
    "no-multi-spaces": [
      "error",
      {
        exceptions: {
          Property: true,
          ObjectExpression: true,
          ArrayExpression: true,
        },
      },
    ],
    "no-multi-str": "error",
    "no-multiple-empty-lines": ["error", {max: 1}],
    "no-native-reassign": "error",
    "no-negated-condition": "off",
    "no-nested-ternary": "error",
    "no-new": "error",
    "no-new-func": "error",
    "no-new-object": "error",
    "no-new-require": "error",
    "no-new-wrappers": "error",
    "no-octal-escape": "off",
    "no-octal": "error",
    "no-param-reassign": "off",
    "no-path-concat": "error",
    "no-plusplus": "off",
    "no-process-env": "off",
    "no-process-exit": "off",
    "no-proto": "off",
    "no-prototype-builtins": "off",
    "no-restricted-globals": "error",
    "no-restricted-imports": "error",
    "no-restricted-modules": "error",
    "no-restricted-syntax": "error",
    "no-return-assign": "error",
    "no-script-url": "off",
    "no-self-compare": "error",
    "no-sequences": "off",
    "no-shadow": "off",
    "no-shadow-restricted-names": "error",
    "no-spaced-func": "error",
    "no-sync": "off",
    "no-ternary": "off",
    "no-throw-literal": "error",
    "no-trailing-spaces": "error",
    "no-undef-init": "error",
    "no-undefined": "off",
    "no-underscore-dangle": "off",
    "no-unmodified-loop-condition": "error",
    "no-unneeded-ternary": "off",
    "no-unsafe-finally": "error",
    "no-unused-expressions": "off",
    "no-use-before-define": "off",
    "no-useless-call": "error",
    "no-useless-computed-key": "error",
    "no-useless-concat": "error",
    "no-useless-constructor": "error",
    "no-useless-escape": "error",
    "no-useless-rename": "error",
    "no-var": "off",
    "no-void": "error",
    "no-warning-comments": "off",
    "no-whitespace-before-property": "error",
    "no-with": "error",
    "object-curly-newline": "off",
    "object-curly-spacing": ["error", "never"],
    "object-property-newline": "off",
    "object-shorthand": "off",
    "one-var": "off",
    "one-var-declaration-per-line": "off",
    "operator-assignment": "off",
    "operator-linebreak": "off",
    "padded-blocks": "off",
    "prefer-arrow-callback": "off",
    "prefer-const": "off",
    "prefer-reflect": "off",
    "prefer-rest-params": "off",
    "prefer-spread": "off",
    "prefer-template": "off",
    "quote-props": "off",
    quotes: "off",
    radix: "off",
    "require-jsdoc": "off",
    "require-yield": "error",
    "rest-spread-spacing": ["error", "never"],
    semi: "off",
    "semi-spacing": "error",
    "sort-imports": "error",
    "sort-vars": "off",
    "space-before-blocks": "error",
    "space-before-function-paren": [
      "error",
      {anonymous: "always", named: "never"},
    ],
    "space-in-parens": ["error", "never"],
    "space-infix-ops": "error",
    "space-unary-ops": "error",
    "spaced-comment": ["error", "always"],
    strict: ["error", "never"],
    "template-curly-spacing": ["error", "never"],
    "unicode-bom": ["error", "never"],
    "valid-jsdoc": "off",
    "wrap-iife": ["error", "inside"],
    "vars-on-top": "off",
    "wrap-regex": "off",
    "yield-star-spacing": "error",
    yoda: "error",
  },
};
