package ee.cyber.sdsb.asyncdb;

import java.text.ParseException;
import java.util.Date;

import org.junit.Before;
import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ee.cyber.sdsb.common.SystemProperties;
import ee.cyber.sdsb.common.identifier.ClientId;

import static org.junit.Assert.*;

// These tests depend on AsyncSenderConfTest.
public class QueueInfoBehavior {
    private static final Logger LOG = LoggerFactory
            .getLogger(QueueInfoBehavior.class);

    private ClientId client = ClientId.create("EE", "tankist",
            AsyncDBTestUtil.getProviderName());

    @Before
    public void setUp() throws Exception {
        System.setProperty(SystemProperties.SERVER_CONFIGURATION_FILE,
                "src/test/resources/serverconf.xml");
    }

    @Test
    public void shouldGiveEmptyMetadataIfNewObjectCreated() {
        QueueInfo queueInfo = QueueInfo.getNew(client);

        assertEquals(0, queueInfo.getRequestCount());
        assertEquals(0, queueInfo.getFirstRequestNo());
        assertNull(queueInfo.getLastSentTime());
        assertEquals(0, queueInfo.getFirstRequestSendCount());
        assertEquals("", queueInfo.getLastSuccessId());
        assertNull(queueInfo.getLastSuccessTime());
        assertEquals("", queueInfo.getLastSendResult());
    }

    @Test
    public void shouldGiveCorrectNextRequestNoIfNoRequests() {
        QueueInfo metadata = new QueueInfo(
                client, 0, 0, null, 0, null, null, null);

        assertEquals(0, metadata.getNextRequestNo());
    }

    @Test
    public void shouldGiveCorrectRequestNoIfRequestsPresent() throws Exception {

        QueueInfo queueInfo = new QueueInfo(
                client, 4, 3, new Date(), 0, null, null, null);

        assertEquals(7, queueInfo.getNextRequestNo());
    }

    @Test
    public void shouldIncreaseRequestCountWhenAddingRequest() {
        QueueInfo initial = new QueueInfo(
                client, 0, 0, null, 0, null, null, null);
        QueueInfo finalProvider = QueueInfo.addRequest(initial);
        assertEquals(1, finalProvider.getRequestCount());
        // TODO - Validate other fields as well!
    }

    @Test
    public void shouldGiveNextAttemptCorrectly() throws ParseException {
        QueueInfo firstQueueInfo = getProviderWithSpecifiedFirstRequestSendCount(0);
        QueueInfo secondQueueInfo = getProviderWithSpecifiedFirstRequestSendCount(1);
        QueueInfo thirdQueueInfo = getProviderWithSpecifiedFirstRequestSendCount(3);
        QueueInfo forthQueueInfo = getProviderWithSpecifiedFirstRequestSendCount(5);

        // XXX This test takes default values of 'basedelay' and 'maxdelay' into
        // consideration.
        Date firstExpectedNextAttempt = AsyncDBTestUtil
                .getDate("2012-04-17 13:00.00");
        Date secondExpectedNextAttempt = AsyncDBTestUtil
                .getDate("2012-04-17 13:05.00");
        Date thirdExpectedNextAttempt = AsyncDBTestUtil
                .getDate("2012-04-17 13:20.00");
        Date forthExpectedNextAttempt = AsyncDBTestUtil
                .getDate("2012-04-17 13:30.00");

        assertEquals(firstExpectedNextAttempt, firstQueueInfo.getNextAttempt());
        assertEquals(secondExpectedNextAttempt, secondQueueInfo.getNextAttempt());
        assertEquals(thirdExpectedNextAttempt, thirdQueueInfo.getNextAttempt());
        assertEquals(forthExpectedNextAttempt, forthQueueInfo.getNextAttempt());

        QueueInfo queueInfoWithoutLastSentTime = new QueueInfo(
                client, 4, 3, null, 0, null, null, null);
        assertNotNull(queueInfoWithoutLastSentTime.getNextAttempt());

        QueueInfo queueInfoWithoutRequests = new QueueInfo(
                client, 0, 0, new Date(), 0, null, null, null);
        assertNull(queueInfoWithoutRequests.getNextAttempt());
    }

    @Test
    public void shouldRemoveFirstRequestProperly() {
        QueueInfo initial = new QueueInfo(
                client, 2, 1, null, 7, null, null, null);

        String id = "456";
        String lastSendResult = "GREAT SUCCESS!";
        QueueInfo result = QueueInfo.removeFirstRequest(initial, id,
                lastSendResult);

        assertEquals(1, result.getRequestCount());
        assertEquals(2, result.getFirstRequestNo());
        assertNotNull(result.getLastSentTime());
        assertEquals(0, result.getFirstRequestSendCount());
        assertEquals(id, result.getLastSuccessId());
        assertEquals(lastSendResult, result.getLastSendResult());
        assertNotNull(result.getLastSuccessTime());
    }

    // In this case lastSendResult should not change
    @Test
    public void shouldRemoveFirstRequestMarkedAsRemoved() {
        String initialLastSendResult = "GREAT SUCCESS!";
        QueueInfo initial = new QueueInfo(
                client, 2, 1, null, 7, null, null, initialLastSendResult);

        String id = "456";
        QueueInfo result = QueueInfo.removeFirstRequest(initial, id);

        assertEquals(1, result.getRequestCount());
        assertEquals(2, result.getFirstRequestNo());
        assertNotNull(result.getLastSentTime());
        assertEquals(0, result.getFirstRequestSendCount());
        assertEquals(id, result.getLastSuccessId());
        assertEquals(initialLastSendResult, result.getLastSendResult());
        assertNotNull(result.getLastSuccessTime());
    }

    @Test
    public void shouldSetFirstRequestNoToZeroIfAllRequestsAreRemoved() {
        QueueInfo initial = new QueueInfo(
                client, 1, 8, null, 7, null, null, null);

        String id = "456";
        String lastSendResult = "EPIC FAILURE";
        QueueInfo result = QueueInfo.removeFirstRequest(initial, id,
                lastSendResult);

        assertEquals(0, result.getRequestCount());
        assertEquals(0, result.getFirstRequestNo());
        assertNotNull(result.getLastSentTime());
        assertEquals(0, result.getFirstRequestSendCount());
        assertEquals(id, result.getLastSuccessId());
        assertEquals(lastSendResult, result.getLastSendResult());
        assertNotNull(result.getLastSuccessTime());
    }

    @Test(expected = IllegalArgumentException.class)
    public void shouldThrowExceptionWhenTryingToRemoveRequestFromEmptyQueue() {
        QueueInfo initial = new QueueInfo(
                client, 0, 0, null, 0, null, null, null);

        QueueInfo.removeFirstRequest(initial, "id", null);
    }

    @Test
    public void shouldIncreaseRequestCountForFailedRequest() {
        QueueInfo initial = new QueueInfo(client, 4, 3, null, 0, null,
                new Date(), null);

        QueueInfo result = QueueInfo.handleFailedRequest(initial,
                "lastSendResult");

        assertEquals(4, result.getRequestCount());
        assertEquals(3, result.getFirstRequestNo());
        assertNotNull(result.getLastSentTime());
        assertEquals(1, result.getFirstRequestSendCount());
        assertEquals("", result.getLastSuccessId());
        assertNotNull(result.getLastSuccessTime());
    }

    @Test
    public void shouldResetSendCount() {
        QueueInfo initial = new QueueInfo(
                client, 4, 3, new Date(), 7, null, new Date(), null);

        QueueInfo result = QueueInfo.resetSendCount(initial);

        assertEquals(4, result.getRequestCount());
        assertEquals(3, result.getFirstRequestNo());
        assertNotNull(result.getLastSentTime());
        assertEquals(0, result.getFirstRequestSendCount());
        assertEquals("", result.getLastSuccessId());
        assertNotNull(result.getLastSuccessTime());

    }

    private QueueInfo getProviderWithSpecifiedFirstRequestSendCount(
            int firstRequestSendCount) throws ParseException {
        Date lastSentTime = AsyncDBTestUtil.getDate("2012-04-17 13:00.00");
        return new QueueInfo(
                client, 4, 3, lastSentTime, firstRequestSendCount, null, null,
                        null);
    }

    @Test
    public void shouldTurnQueueToAndFromJson() {
        QueueInfo queueInfo = new QueueInfo(
                client, 1, 0, new Date(), 0, "lastSuccessId", new Date(),
                        "Asi toimis!");

        String json = queueInfo.toJson();
        LOG.debug("Queue turned into JSON: '{}'", json);

        QueueInfo readBack = QueueInfo.fromJson(json);
        LOG.debug("Queue info read back from JSON: '{}'", readBack);
    }
}