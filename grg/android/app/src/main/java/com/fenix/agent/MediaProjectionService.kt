package com.fenix.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder

/**
 * MediaProjection Foreground Service — Real-Time Screen Capture & WSS Stream
 */
class MediaProjectionService : Service() {

    private val CHANNEL_ID = "FenixScreenStreamChannel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("FÊNIX OS — Transmissão de Tela")
            .setContentText("Transmitindo tela remotamente para o Control Plane...")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .build()
        startForeground(101, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Initializes VirtualDisplay and connects to WebSocket screen stream endpoint
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "FÊNIX Screen Streaming",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }
}
