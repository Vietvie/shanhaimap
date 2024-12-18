const axios = require('axios');
const { writeFileSync, readFileSync } = require('fs-extra');

//UTILS
const sleep = (minisecond) =>
    new Promise((resolve) => setTimeout(resolve, minisecond || 1000));

// const SUSPENDED_STATE_STRING = '挂起';
const SUSPENDED_STATE_STRING = 'hang-up';

const SETTING = readFileSync('setting.txt', {
    encoding: 'utf-8',
});
const TOKEN = SETTING.split('=')[1];

async function getOrderList(pageSize = 500) {
    const TODAY = new Date();
    const DAY = TODAY.getDate();
    const MONTH = TODAY.getMonth() + 1;
    const YEAR = TODAY.getFullYear();
    try {
        const { data } = await axios.get(
            `https://office.shanhaimap.com/apis/jeecg-system/order/list2?_t=1728701921&createTime_begin=${`${
                YEAR - 1
            }-${MONTH}-${DAY}`}&createTime_end=${`${YEAR}-${MONTH}-${DAY}`}&unhide=false&column=createTime&order=desc&field=id,createTime,contractSigningDate,code,customerName,sellStaffName,projectManagerName,state,updateBy,operation&pageNo=1&pageSize=${pageSize}`,
            {
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language':
                        'en-US,en;q=0.9,vi;q=0.8,zh-TW;q=0.7,zh-CN;q=0.6,zh;q=0.5',
                    Connection: 'keep-alive',
                    Referer:
                        'https://office.shanhaimap.com/shmapweb/order/check/list',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    'X-Access-Token': TOKEN,
                },
            }
        );

        if (data.code !== 200) {
            return null;
        }
        const dataModified = data.result.records.map((order) => ({
            id: order.id,
            state: order.state,
            code: order.code,
            contractCode: order.contractCode,
            customerName: order.customerName,
            sellStaffName: order.sellStaffName,
            projectManagerName: order.projectManagerName,
        }));
        return dataModified;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getOrderServices(orderId) {
    if (!orderId) {
        console.log('orderId is required!');
        return null;
    }
    try {
        const { data } = await axios.get(
            'https://office.shanhaimap.com/apis/jeecg-system/order/step/list',
            {
                params: {
                    _t: '1728923198',
                    orderId,
                    pageNo: '1',
                    pageSize: '100',
                },
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language':
                        'en-US,en;q=0.9,vi;q=0.8,zh-TW;q=0.7,zh-CN;q=0.6,zh;q=0.5',
                    Connection: 'keep-alive',
                    'X-Access-Token': TOKEN,
                },
            }
        );

        if (data.code !== 200) {
            console.log(data);
            return null;
        }
        return data.result.records;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getServiceSteps(stepId) {
    try {
        const { data } = await axios.get(
            'https://office.shanhaimap.com/apis/jeecg-system/order/product/process/list',
            {
                params: {
                    _t: '1728924066',
                    stepId: stepId,
                    pageNo: '1',
                    pageSize: '100',
                },
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language':
                        'en-US,en;q=0.9,vi;q=0.8,zh-TW;q=0.7,zh-CN;q=0.6,zh;q=0.5',
                    Connection: 'keep-alive',
                    'X-Access-Token': TOKEN,
                },
            }
        );

        if (data.code !== 200) {
            console.log(data);
            return null;
        }
        return data.result.records;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getServiceStepsInfo(businessId) {
    try {
        const { data } = await axios.get(
            'https://office.shanhaimap.com/apis/jeecg-system/busilog/busiOpLog/list',
            {
                params: {
                    businessId,
                    logModule: '2',
                    pageSize: '-1',
                },
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language':
                        'en-US,en;q=0.9,vi;q=0.8,zh-TW;q=0.7,zh-CN;q=0.6,zh;q=0.5',
                    Connection: 'keep-alive',
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    'X-Access-Token': TOKEN,
                },
            }
        );

        if (data.code !== 200) {
            console.log(data);
            return null;
        }
        return data.result.records;
    } catch (error) {
        console.log(error);
        return null;
    }
}

// getOrderList();
// getOrderServices();
// getServiceSteps();
// getServiceStepsInfo('1840659996374724610');

async function trackingOrders(params) {
    const orders = await getOrderList();
    if (!orders) {
        console.log('❌ TOKEN ERROR! SETTING NEW TOKEN!');
        return null;
    }

    const orderSlice = orders.slice(0, 1000);
    const suspendOrders = [];

    for (let i = 0; i < orderSlice.length; i++) {
        const order = orderSlice[i];
        console.log(`[ ${i + 1}/${orderSlice.length} ] ${order.code}`);
        const serviceList = await getOrderServices(order.id);
        if (!serviceList) continue;
        for (const service of serviceList) {
            const stepList = await getServiceSteps(service.id);
            if (!stepList) continue;
            for (const step of stepList) {
                const stepInfoList = await getServiceStepsInfo(step.id);
                if (!stepInfoList || !stepInfoList.length) continue;
                const lastStepRecord = stepInfoList[stepInfoList.length - 1];

                if (
                    lastStepRecord.operateType.includes(SUSPENDED_STATE_STRING)
                ) {
                    console.log('Found Order Suspened');
                    suspendOrders.push({
                        ...order,
                        serviceName: service.stepName,
                        processName: step.fullProcessName,
                        suspendTime: lastStepRecord.createTime,
                        restartTime: JSON.parse(lastStepRecord.extraProps)
                            .nextRestartTime,
                    });
                }
            }
        }
        await sleep(300);
    }
    writeFileSync('suspended_order.json', JSON.stringify(suspendOrders), {
        encoding: 'utf-8',
    });

    console.log('✅ RUN COMPELETED!!!!!');
    console.log(`${suspendOrders.length} suspended orders`);
}

trackingOrders();
