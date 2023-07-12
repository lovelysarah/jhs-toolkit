type Config = {
    CONTENT: {
        HEADER: {
            PREFIX: string;
            NAME: string;
        };
        FOOTER: {
            LOGO_ALT_TEXT: string;
        };
    };
    FEATURE_FLAG: {
        SUMMARY_SEARCH: boolean;
        SUMMARY_MORE_ACTIONS: boolean;
        OVERVIEW_SHOW_RECENT_ACTIVITY: boolean;
        CHECKIN_NOTE: boolean;
    };
};

export const CONTENT = {
    HEADER: {
        PREFIX: "JHS",
        NAME: "Storage",
    },
    FOOTER: {
        LOGO_ALT_TEXT: "Generic brand Inc.",
    },
} satisfies Config["CONTENT"];

export const FEATURE_FLAG = {
    SUMMARY_SEARCH: false,
    SUMMARY_MORE_ACTIONS: false,
    OVERVIEW_SHOW_RECENT_ACTIVITY: true,
    CHECKIN_NOTE: false,
} satisfies Config["FEATURE_FLAG"];

export default {
    CONTENT,
    FEATURE_FLAG,
} satisfies Config;
