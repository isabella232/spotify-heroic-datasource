import HeroicQuery from "./heroic_query";
export declare class MetadataClient {
    private datasource;
    private uiSegmentSrv;
    private templateSrv;
    private $q;
    private scopedVars;
    private target;
    private removeTagFilterSegment;
    private tagSegments;
    private includeVariables;
    private includeScopes;
    static templateUrl: string;
    static DEBOUNCE_MS: number;
    queryModel: HeroicQuery;
    lruTag: any;
    lruTagValue: any;
    keyLru: any;
    error: any;
    /** @ngInject **/
    constructor(datasource: any, uiSegmentSrv: any, templateSrv: any, $q: any, scopedVars: any, target: any, removeTagFilterSegment: any, tagSegments: any, includeVariables: any, includeScopes: any);
    getMeasurements: any;
    handleQueryError(err: any): any[];
    transformToSegments(addTemplateVars: any, segmentKey: any): (results: any) => any;
    queryTagsAndValues(data: any, dedupe: any, cache: any): any;
    getTagsOrValues: any;
    getTagValueOperator(tagValue: any, tagOperator: any): string;
}
