// User roles
export var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["MODERATOR"] = "MODERATOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (UserRole = {}));
// Work types
export var WorkType;
(function (WorkType) {
    WorkType["ILLUSTRATION"] = "ILLUSTRATION";
    WorkType["NOVEL"] = "NOVEL";
    WorkType["OTHER"] = "OTHER";
})(WorkType || (WorkType = {}));
// Work status
export var WorkStatus;
(function (WorkStatus) {
    WorkStatus["DRAFT"] = "DRAFT";
    WorkStatus["PENDING"] = "PENDING";
    WorkStatus["PUBLISHED"] = "PUBLISHED";
    WorkStatus["REJECTED"] = "REJECTED";
})(WorkStatus || (WorkStatus = {}));
// Work visibility
export var WorkVisibility;
(function (WorkVisibility) {
    WorkVisibility["VISIBLE"] = "VISIBLE";
    WorkVisibility["HIDDEN_BY_BAN"] = "HIDDEN_BY_BAN";
})(WorkVisibility || (WorkVisibility = {}));
// Report target type
export var ReportTargetType;
(function (ReportTargetType) {
    ReportTargetType["WORK"] = "WORK";
    ReportTargetType["COMMENT"] = "COMMENT";
    ReportTargetType["USER"] = "USER";
})(ReportTargetType || (ReportTargetType = {}));
// Report status
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "PENDING";
    ReportStatus["RESOLVED"] = "RESOLVED";
    ReportStatus["DISMISSED"] = "DISMISSED";
})(ReportStatus || (ReportStatus = {}));
// File processing status
export var FileStatus;
(function (FileStatus) {
    FileStatus["UPLOADED"] = "UPLOADED";
    FileStatus["PROCESSING"] = "PROCESSING";
    FileStatus["READY"] = "READY";
    FileStatus["FAILED"] = "FAILED";
})(FileStatus || (FileStatus = {}));
// Relation types for characters
export var CharacterRelationType;
(function (CharacterRelationType) {
    CharacterRelationType["LOVER"] = "LOVER";
    CharacterRelationType["PARTNER"] = "PARTNER";
    CharacterRelationType["FRIEND"] = "FRIEND";
    CharacterRelationType["RIVAL"] = "RIVAL";
    CharacterRelationType["MENTOR"] = "MENTOR";
    CharacterRelationType["STUDENT"] = "STUDENT";
    CharacterRelationType["FAMILY"] = "FAMILY";
    CharacterRelationType["ENEMY"] = "ENEMY";
    CharacterRelationType["OTHER"] = "OTHER";
})(CharacterRelationType || (CharacterRelationType = {}));
// News categories
export var NewsCategory;
(function (NewsCategory) {
    NewsCategory["ANIME"] = "ANIME";
    NewsCategory["MOVIE"] = "MOVIE";
    NewsCategory["GAME"] = "GAME";
    NewsCategory["AUTHOR"] = "AUTHOR";
    NewsCategory["MERCHANDISE"] = "MERCHANDISE";
    NewsCategory["EVENT"] = "EVENT";
    NewsCategory["OTHER"] = "OTHER";
})(NewsCategory || (NewsCategory = {}));
//# sourceMappingURL=index.js.map