using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

public class CameraController : MonoBehaviour
{
    private float prevClickPos;

    // Update is called once per frame
    void Update()
    {
        if (Input.GetMouseButton((int)MouseButton.LeftMouse)) transform.Rotate(transform.up, transform.rotation.y + (Input.GetAxis("Mouse X") - prevClickPos));
        prevClickPos = Input.GetAxis("Mouse X");
    }
}
