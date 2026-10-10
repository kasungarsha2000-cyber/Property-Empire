package com.propertyempire.game;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Device smoke test: the installed package is the Property Empire app. */
@RunWith(AndroidJUnit4.class)
public class AppContextTest {

    @Test
    public void usesPropertyEmpirePackage() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.propertyempire.game", appContext.getPackageName());
    }
}
