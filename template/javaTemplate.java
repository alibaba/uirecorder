package com.aliyun.iotx.test;

import com.aliyun.iotx.framework.Operation;
import com.aliyun.iotx.framework.testInit.BaseTest;
import com.aliyun.iotx.framework.ui.driver.IoTDriver;
import org.testng.annotations.Test;


public class JavaUITest extends BaseTest {

    @Test
    public void test() {

        IoTDriver.startup();

        Operation operation = new Operation() {
            @Override
            public void doSomeThing() {
                {$testCodes}
                //java code ending
            }
        };

        {$openUrl}
        
    }
}
