export type AdapterResponseError = { domain: string; code: number; message: string };

export type AdapterResponseInfo = {
  adapterClassName: string;
  adSourceName: string | null;
  adSourceId: string | null;
  adSourceInstanceName: string | null;
  adSourceInstanceId: string | null;
  latencyMillis: number;
  adError: AdapterResponseError | null;
};

export type ResponseInfoExtras = {
  mediationGroupName?: string;
  mediationAbTestName?: string;
  mediationAbTestVariant?: string;
  creativeId?: string;
  lineItemId?: string;
};

export type ResponseInfo = {
  responseId: string | null;
  adapterClassName: string | null;
  loadedAdapterResponse: AdapterResponseInfo | null;
  adapterResponses: AdapterResponseInfo[];
  extras: ResponseInfoExtras;
};

export type PaidResponseInfo = Pick<
  ResponseInfo,
  'responseId' | 'adapterClassName' | 'loadedAdapterResponse' | 'extras'
>;
