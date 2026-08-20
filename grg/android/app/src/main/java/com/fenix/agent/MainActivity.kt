package com.fenix.agent

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast

/**
 * FÊNIX Mobile Agent — Main Pairing & Permission Control Screen
 */
class MainActivity : Activity() {

    private val MEDIA_PROJECTION_REQUEST_CODE = 1001
    private lateinit var projectionManager: MediaProjectionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        // Setup layout programmatically
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 80, 48, 48)
            setBackgroundColor(0xFF0A0F1C.toInt())
        }

        val title = TextView(this).apply {
            text = "FÊNIX OS — Mobile Agent"
            textSize = 24f
            setTextColor(0xFF38BDF8.toInt())
        }
        layout.addView(title)

        val statusText = TextView(this).apply {
            text = "Status: Conectado ao Fênix VPS\nDispositivo: Android-01"
            textSize = 16f
            setTextColor(0xFF10B981.toInt())
            setPadding(0, 32, 0, 48)
        }
        layout.addView(statusText)

        val pairBtn = Button(this).apply {
            text = "Escanear QR Code de Pareamento"
            setBackgroundColor(0xFF0284C7.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener {
                Toast.makeText(this@MainActivity, "Iniciando leitor de QR Code Fênix...", Toast.LENGTH_SHORT).show()
            }
        }
        layout.addView(pairBtn)

        val screenShareBtn = Button(this).apply {
            text = "Autorizar Transmissão de Tela (MediaProjection)"
            setBackgroundColor(0xFFF97316.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener {
                startActivityForResult(projectionManager.createScreenCaptureIntent(), MEDIA_PROJECTION_REQUEST_CODE)
            }
        }
        layout.addView(screenShareBtn)

        setContentView(layout)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == MEDIA_PROJECTION_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            val serviceIntent = Intent(this, MediaProjectionService::class.java).apply {
                putExtra("resultCode", resultCode)
                putExtra("data", data)
            }
            startForegroundService(serviceIntent)
            Toast.makeText(this, "Transmissão de tela iniciada com sucesso.", Toast.LENGTH_SHORT).show()
        }
        super.onActivityResult(requestCode, resultCode, data)
    }
}
