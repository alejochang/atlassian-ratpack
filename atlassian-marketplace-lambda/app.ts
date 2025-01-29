import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as z from 'zod';
import axios from 'axios';

const PayloadCodec = z.object({
    addon: z.string()
});

type Payload = z.infer<typeof PayloadCodec>;

const ApiResponseCodec = z.object({
    addonKey: z.string(),
    summary: z.string(),
});
type ApiResponse = z.infer<typeof ApiResponseCodec>;

const parseRecord = (record: SQSRecord): Payload => {
    try {
        return PayloadCodec.parse(JSON.parse(record.body));
    } catch (e) {
        console.error('Failed to parse record body:', record.body, e);
        return { addon: "invalid" };
        // return null;
    }
}

const fetchAppSummary = async (addonKey: string): Promise<string> => {
    try {
        const response = await axios.get(`https://marketplace.atlassian.com/rest/2/addons/${addonKey}`);
        const data = ApiResponseCodec.parse(response.data);
        return data.summary;
    } catch (error) {
        console.error(`Failed to fetch for addon ${addonKey}:`, error);
        return 'Unknown app summary';
    }
};

export const lambdaHandler = async (event: SQSEvent): Promise<string[]> => {
    const relevantPayloads = event.Records
        .map(parseRecord)
        .filter(payload => payload.addon !== 'invalid');

    if (!relevantPayloads.length) {
        throw new Error('No valid records');
    }

    const summaries = await Promise.all(
        relevantPayloads.map((relevantPayload) =>   fetchAppSummary(relevantPayload.addon))
    );

    return summaries


    // TODO
    // For each entry in `relevantPayloads` make a request to the Atlassian Marketplace REST API using
    // the addonKey to get the app summary
    // Validate the HTTP response from the REST API using zod, if it's invalid return "Unknown app summary"

    // return Promise.resolve([]);
};