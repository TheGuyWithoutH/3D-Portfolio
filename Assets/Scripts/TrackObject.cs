using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TrackObject : MonoBehaviour
{
    [SerializeField] private GameObject _object;
    [SerializeField] private Vector3 _offset;
 
    private Camera mCamera;
    private RectTransform rt;
    private Vector2 pos;

    void Start ()
    {
        mCamera = GameObject.FindGameObjectWithTag("MainCamera").GetComponent<Camera> ();
        Debug.Log(mCamera);
        rt = GetComponent<RectTransform>();
        Debug.Log(rt);
    }
 
    void Update ()
    {
        if (_object)
        {
            pos = RectTransformUtility.WorldToScreenPoint (mCamera, _object.transform.position + _offset);
            rt.position = pos;
        }
        else
        {
            Debug.LogError (gameObject.name + ": No Object Attached (TrackObject)");
        }
         
 
    }
}
